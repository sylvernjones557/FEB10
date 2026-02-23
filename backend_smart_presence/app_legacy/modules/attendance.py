import cv2
import numpy as np
from typing import List, Dict, Any
from datetime import datetime

from app.state.session_state import AttendanceSession
from app.modules.recognition import get_face_recognizer


# -------------------------------------------------------------------
# Load Haar Cascade once
# -------------------------------------------------------------------

FACE_CASCADE = cv2.CascadeClassifier(
    "app/models/haarcascade_frontalface_default.xml"
)


# -------------------------------------------------------------------
# Phase 2 : REST compatibility functions
# -------------------------------------------------------------------

def start_attendance(class_id: str, period: int) -> Dict[str, Any]:
    return {
        "status": "started",
        "class_id": class_id,
        "period": period,
        "started_at": datetime.utcnow().isoformat()
    }


def pause_attendance(class_id: str, period: int) -> Dict[str, Any]:
    return {"status": "paused", "class_id": class_id, "period": period}


def resume_attendance(class_id: str, period: int) -> Dict[str, Any]:
    return {"status": "resumed", "class_id": class_id, "period": period}


def stop_attendance(class_id: str, period: int) -> Dict[str, Any]:
    return {"status": "stopped", "class_id": class_id, "period": period}


def end_attendance(class_id: str, period: int) -> Dict[str, Any]:
    return {"status": "ended", "class_id": class_id, "period": period}


# -------------------------------------------------------------------
# Phase 4 : Face detection and cropping
# -------------------------------------------------------------------

def detect_and_crop_faces(
    frame: np.ndarray
) -> tuple[List[np.ndarray], np.ndarray]:
    """
    Detect faces using Haar Cascade and return cropped face images.
    """

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.2,
        minNeighbors=3,
        minSize=(30, 30)
    )

    face_crops: List[np.ndarray] = []
    for (x, y, w, h) in faces:
        face_crops.append(frame[y:y + h, x:x + w])

    return face_crops, frame


# -------------------------------------------------------------------
# Backward compatibility wrapper (IMPORTANT)
# -------------------------------------------------------------------

def detect_faces_from_frame(frame: np.ndarray):
    """
    Backward-compatible alias for ai_gateway imports.
    """
    return detect_and_crop_faces(frame)


# -------------------------------------------------------------------
# Phase 5 : Attendance update using recognition
# -------------------------------------------------------------------

def update_attendance_from_frame(
    session: AttendanceSession,
    face_crops: List[np.ndarray]
) -> int:
    """
    Update attendance using recognized faces.
    """

    if not session.active or session.paused:
        return len(session.detected_students)

    session.frame_count += 1

    recognizer = get_face_recognizer()

    for face in face_crops:
        student_id = recognizer.recognize(face)

        if student_id:
            session.detected_students.add(student_id)

    return len(session.detected_students)
