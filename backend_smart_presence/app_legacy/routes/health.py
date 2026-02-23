from fastapi import APIRouter
from app.modules.ai_engine.face_store import get_face_store

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "smart-presence-ai",
        "phase": "5.1"
    }

@router.get("/debug/identities")
def debug_identities():
    store = get_face_store()
    return {
        "identity_count": store.collection.count()
    }
