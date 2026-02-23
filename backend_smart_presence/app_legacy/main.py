import threading
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException

from app.modules.attendance_engine.session_manager import SessionManager
from app.modules.video.live_recognition_loop import LiveRecognitionLoop
from app.routes import auth as auth_routes
from app.routes import identity
from app.routes import staff as staff_routes


# --------------------------------------------------
# App init
# --------------------------------------------------
app = FastAPI(title="Smart Presence Backend – Phase 9.3")

# 🔑 Mount identity (face registration) routes
app.include_router(identity.router)
app.include_router(auth_routes.router)
app.include_router(staff_routes.router)

# --------------------------------------------------
# Global session manager (single active session)
# --------------------------------------------------
session_manager = SessionManager()

# --------------------------------------------------
# Live recognition loop control
# --------------------------------------------------
recognition_loop: LiveRecognitionLoop | None = None
recognition_thread: threading.Thread | None = None


# --------------------------------------------------
# Health check
# --------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------
# START ATTENDANCE (SCANNING)
# --------------------------------------------------
@app.post("/attendance/start")
def start_attendance(
    staff_id: str,
    class_id: str,
    period: int
):
    global recognition_loop, recognition_thread

    try:
        session_meta = session_manager.start_session(
            staff_id=staff_id,
            class_id=class_id,
            period=period
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Start live recognition in background thread
    recognition_loop = LiveRecognitionLoop(
    session_manager,
    video_source="http://192.168.1.4:8080/video"
)

    recognition_thread = threading.Thread(
        target=recognition_loop.start,
        daemon=True
    )
    recognition_thread.start()

    return {
        "message": "Attendance session started",
        "state": session_manager.get_state(),
        "session": session_meta
    }


# --------------------------------------------------
# LIVE STATUS (polling or UI refresh)
# --------------------------------------------------
@app.get("/attendance/status")
def attendance_status():
    return {
        "active": session_manager.is_active(),
        "state": session_manager.get_state(),
        "present_count": (
            session_manager.attendance_engine.get_present_count()
            if session_manager.is_active()
            else 0
        )
    }


# --------------------------------------------------
# STOP SCANNING → VERIFYING
# --------------------------------------------------
@app.post("/attendance/stop")
def stop_scanning():
    global recognition_loop

    if not session_manager.is_active():
        raise HTTPException(status_code=400, detail="No active session")

    # Stop AI loop first (very important)
    if recognition_loop:
        recognition_loop.stop()
        recognition_loop = None

    try:
        result = session_manager.stop_scanning()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Scanning stopped. Verification required.",
        "state": session_manager.get_state(),
        "present": result["present"],
        "absent": result["absent"]
    }


# --------------------------------------------------
# VERIFY ATTENDANCE (HUMAN-IN-THE-LOOP)
# --------------------------------------------------
@app.post("/attendance/verify")
def verify_attendance(
    manual_present: List[str] = [],
    manual_absent: List[str] = []
):
    try:
        session_manager.verify(
            manual_present=manual_present,
            manual_absent=manual_absent
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Attendance verified",
        "state": session_manager.get_state()
    }


# --------------------------------------------------
# FINALIZE & LOCK ATTENDANCE
# --------------------------------------------------
@app.post("/attendance/finalize")
def finalize_attendance():
    try:
        summary = session_manager.finalize()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Attendance finalized and locked",
        "state": "LOCKED",
        "summary": summary
    }


# --------------------------------------------------
# WEBSOCKET – LIVE ATTENDANCE UPDATES
# --------------------------------------------------
@app.websocket("/ws/attendance")
async def attendance_ws(ws: WebSocket):
    await ws.accept()

    try:
        while True:
            payload = {
                "active": session_manager.is_active(),
                "state": session_manager.get_state(),
                "present_count": (
                    session_manager.attendance_engine.get_present_count()
                    if session_manager.is_active()
                    else 0
                )
            }

            await ws.send_json(payload)

            # Keep connection alive
            await ws.receive_text()

    except WebSocketDisconnect:
        pass
