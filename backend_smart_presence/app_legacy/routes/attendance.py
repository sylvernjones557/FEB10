from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.modules.attendance_engine.session_manager import SESSION_MANAGER

router = APIRouter()


# ----------------------------
# Request Schemas
# ----------------------------

class StartAttendanceRequest(BaseModel):
    session_id: str
    class_id: str
    period: int


# ----------------------------
# Attendance Lifecycle APIs
# ----------------------------

@router.post("/attendance/start")
def start_session(data: StartAttendanceRequest):
    """
    Starts a new attendance session.
    """
    session = SESSION_MANAGER.start_session(data.session_id)

    return {
        "session_id": session.session_id,
        "class_id": data.class_id,
        "period": data.period,
        "status": "started"
    }


@router.post("/attendance/pause")
def pause_session():
    """
    Placeholder – pipeline pause logic handled elsewhere.
    """
    return {"message": "Attendance session paused"}


@router.post("/attendance/resume")
def resume_session():
    """
    Placeholder – pipeline resume logic handled elsewhere.
    """
    return {"message": "Attendance session resumed"}


@router.post("/attendance/end")
def end_session(session_id: str):
    """
    Ends an attendance session and removes it from memory.
    """
    session = SESSION_MANAGER.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    SESSION_MANAGER.end_session(session_id)

    return {
        "session_id": session_id,
        "status": "ended"
    }


# ----------------------------
# Status & Debug APIs
# ----------------------------

@router.get("/attendance/status")
def session_status(session_id: str):
    """
    Lightweight status check for a session.
    """
    session = SESSION_MANAGER.get_session(session_id)

    if not session:
        return {"active": False}

    return {
        "active": True,
        "session_id": session.session_id,
        "total_present": len(session.persons),
        "duplicates": len(session.duplicates),
        "flagged_low_confidence": len(session.flagged_low_confidence),
        "last_updated": session.last_updated
    }


@router.get("/attendance/session/{session_id}/debug")
def debug_attendance_session(session_id: str):
    """
    Full debug output for Phase 7.2.
    """
    session = SESSION_MANAGER.get_session(session_id)

    if not session:
        return {"error": "Session not found"}

    return session.summary()

class SimulateRecognitionRequest(BaseModel):
    session_id: str
    person_id: str
    confidence: float


@router.post("/attendance/simulate")
def simulate_recognition(data: SimulateRecognitionRequest):
    """
    TEMP endpoint to simulate face recognition events.
    """
    session = SESSION_MANAGER.get_session(data.session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.add_recognition_event(
        person_id=data.person_id,
        confidence=data.confidence
    )

    return {
        "message": "Recognition event simulated",
        "person_id": data.person_id,
        "confidence": data.confidence
    }
