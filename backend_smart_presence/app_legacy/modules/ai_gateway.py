from app.state.session_state import get_session
from app.modules.attendance import (
    detect_faces_from_frame,
    update_attendance_from_frame
)


# -------------------------------------------------------------------
# Central AI Gateway (Phase 5)
# -------------------------------------------------------------------

def process_frame(session_id: str, frame: bytes) -> int:
    """
    Entry point for every incoming frame.
    """

    session = get_session(session_id)
    if not session:
        return 0

    # detect faces and extract crops
    face_crops, _ = detect_faces_from_frame(frame)

    # update attendance using recognition
    return update_attendance_from_frame(session, face_crops)

