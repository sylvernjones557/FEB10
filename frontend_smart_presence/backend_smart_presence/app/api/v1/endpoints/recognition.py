"""Face recognition endpoints — register and recognize faces. CPU-optimized."""
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
from app.core.config import settings

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
    """Read an uploaded image file into an OpenCV BGR array.
    Downscales large images immediately to reduce CPU load."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Downscale large images immediately to save CPU on all subsequent operations
    max_dim = settings.MAX_IMAGE_DIMENSION
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
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

    # ── Duplicate face verification ──
    # Search the vector store to see if this face already belongs to someone else
    from app.core.config import settings
    dup_threshold = getattr(settings, "FACE_DUPLICATE_THRESHOLD", 0.35)  # stricter than match
    if store.get_count() > 0:
        dup_results = store.search_face(embedding, n_results=1)
        if dup_results and dup_results["distances"] and dup_results["distances"][0]:
            dup_distance = dup_results["distances"][0][0]
            dup_meta = dup_results["metadatas"][0][0] if dup_results["metadatas"] and dup_results["metadatas"][0] else {}
            existing_id = dup_meta.get("student_id", "")
            if dup_distance <= dup_threshold and existing_id != canonical_id:
                # Look up existing student name for a helpful message
                existing_student = db.query(models.Student).filter(
                    models.Student.id == existing_id
                ).first()
                existing_name = existing_student.name if existing_student else existing_id
                raise HTTPException(
                    status_code=409,
                    detail=f"DUPLICATE_FACE: This face is already registered to \"{existing_name}\". "
                           f"Each student must have a unique face. Registration cancelled."
                )

    # Store in vector DB with canonical UUID
    store.add_face(canonical_id, embedding, {"student_id": canonical_id})

    # Mark student as face_data_registered in Postgres
    student.face_data_registered = True
    db.commit()

    return {"message": "Face registered successfully", "student_id": canonical_id}


@router.post("/clear-faces")
async def clear_all_faces(
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Clear ALL face embeddings from the vector store and reset face_data_registered flags."""
    store = get_vector_store()
    count_before = store.get_count()
    store.clear_all()

    # Reset face_data_registered for all students in Postgres
    db.query(models.Student).update({"face_data_registered": False})
    db.commit()

    return {"message": f"Cleared {count_before} face embeddings. All students reset.", "cleared": count_before}


@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Recognize faces in an image frame. Returns matches with student IDs and bounding boxes."""
    engine = get_face_engine()
    store = get_vector_store()

    img = await _read_image(file)
    h_img, w_img = img.shape[:2]
    faces = engine.get_faces(img)

    if not faces:
        return {"match": False, "matches": [], "unrecognized": [], "frame_size": [w_img, h_img], "detail": "No faces detected"}

    from app.core.config import settings
    threshold = settings.FACE_MATCH_THRESHOLD

    all_matches = []
    unrecognized = []

    for face in faces:
        emb = face.embedding.tolist()
        bbox = face.bbox.tolist()  # [x1, y1, x2, y2] in pixel coords
        # Normalize bbox to 0-1 range relative to frame size
        norm_bbox = [bbox[0] / w_img, bbox[1] / h_img, bbox[2] / w_img, bbox[3] / h_img]

        results = store.search_face(emb, n_results=1)

        matched = False
        if results and results["distances"] and results["distances"][0]:
            distance = results["distances"][0][0]
            metadata = results["metadatas"][0][0] if results["metadatas"] and results["metadatas"][0] else {}
            student_id = metadata.get("student_id", "unknown")

            if distance <= threshold:
                matched = True
                all_matches.append({
                    "student_id": student_id,
                    "distance": distance,
                    "metadata": metadata,
                    "bbox": norm_bbox,
                })

                # Auto-mark present if there's an active attendance session
                if session_manager.state == "SCANNING":
                    session_manager.mark_present(student_id)

        if not matched:
            unrecognized.append({"bbox": norm_bbox})

    return {
        "match": len(all_matches) > 0,
        "matches": all_matches,
        "unrecognized": unrecognized,
        "frame_size": [w_img, h_img],
    }
