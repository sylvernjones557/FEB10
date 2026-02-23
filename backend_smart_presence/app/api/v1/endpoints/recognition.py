"""Face recognition endpoints — register and recognize faces."""
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import numpy as np
import cv2

from app import models
from app.api import deps
from app.db.session import get_db
from app.core.session_manager import session_manager

router = APIRouter()

# Lazy-load face engine and vector store to avoid import errors when insightface is not installed
_face_engine = None
_vector_store = None


def get_face_engine():
    global _face_engine
    if _face_engine is None:
        try:
            from app.core.face_engine import face_engine
            _face_engine = face_engine
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Face engine not available: {e}")
    return _face_engine


def get_vector_store():
    global _vector_store
    if _vector_store is None:
        try:
            from app.db.vector_store import vector_store
            _vector_store = vector_store
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Vector store not available: {e}")
    return _vector_store


async def _read_image(file: UploadFile) -> np.ndarray:
    """Read an uploaded image file into an OpenCV BGR array."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return img


@router.post("/register-face")
async def register_face(
    student_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Register a face embedding for a student."""
    engine = get_face_engine()
    store = get_vector_store()

    # Resolve student: look up by UUID, external_id, or roll_no
    student = None
    try:
        student = db.query(models.Student).filter(models.Student.id == UUID(student_id)).first()
    except (ValueError, AttributeError):
        pass
    if not student:
        student = db.query(models.Student).filter(
            (models.Student.external_id == student_id) |
            (models.Student.roll_no == student_id)
        ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Always store with the canonical UUID so finalize can match
    canonical_id = str(student.id)

    img = await _read_image(file)
    embedding = engine.extract_embedding(img)
    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected in image. Ensure face is clearly visible.")

    # Store in vector DB with canonical UUID
    store.add_face(canonical_id, embedding, {"student_id": canonical_id})

    # Mark student as face_data_registered in Postgres
    student.face_data_registered = True
    db.commit()

    return {"message": "Face registered successfully", "student_id": canonical_id}


@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Recognize faces in an image frame. Returns matches with student IDs."""
    engine = get_face_engine()
    store = get_vector_store()

    img = await _read_image(file)
    embeddings = engine.extract_embeddings(img)

    if not embeddings:
        return {"match": False, "matches": [], "detail": "No faces detected"}

    from app.core.config import settings
    threshold = settings.FACE_MATCH_THRESHOLD

    all_matches = []
    for emb in embeddings:
        results = store.search_face(emb, n_results=1)

        if results and results["distances"] and results["distances"][0]:
            distance = results["distances"][0][0]
            metadata = results["metadatas"][0][0] if results["metadatas"] and results["metadatas"][0] else {}
            student_id = metadata.get("student_id", "unknown")

            if distance <= threshold:
                all_matches.append({
                    "student_id": student_id,
                    "distance": distance,
                    "metadata": metadata,
                })

                # Auto-mark present if there's an active attendance session
                if session_manager.state == "SCANNING":
                    session_manager.mark_present(student_id)

    return {
        "match": len(all_matches) > 0,
        "matches": all_matches,
    }
