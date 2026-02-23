from typing import Dict, Set, Optional
from datetime import datetime, date


# -------------------------------------------------------------------
# Core attendance session
# -------------------------------------------------------------------

class AttendanceSession:
    def __init__(self, session_id: str, class_id: str, period: int):
        self.session_id = session_id
        self.class_id = class_id
        self.period = period

        self.active: bool = True
        self.paused: bool = False

        self.started_at: datetime = datetime.utcnow()
        self.ended_at: Optional[datetime] = None

        self.detected_students: Set[str] = set()
        self.frame_count: int = 0

    def pause(self):
        self.paused = True

    def resume(self):
        self.paused = False

    def close(self):
        self.active = False
        self.ended_at = datetime.utcnow()


# -------------------------------------------------------------------
# In-memory registry
# -------------------------------------------------------------------

SESSIONS: Dict[str, AttendanceSession] = {}


def build_session_id(class_id: str, period: int) -> str:
    today = date.today().isoformat()
    return f"{class_id}:P{period}:{today}"


def create_session(class_id: str, period: int) -> AttendanceSession:
    session_id = build_session_id(class_id, period)
    session = AttendanceSession(session_id, class_id, period)
    SESSIONS[session_id] = session
    return session


def get_session(session_id: str) -> Optional[AttendanceSession]:
    return SESSIONS.get(session_id)


def close_session(session_id: str):
    session = SESSIONS.get(session_id)
    if session:
        session.close()


# -------------------------------------------------------------------
# Phase 2 compatibility adapter
# -------------------------------------------------------------------

class SessionManager:
    @staticmethod
    def start(class_id: str, period: int) -> AttendanceSession:
        return create_session(class_id, period)

    @staticmethod
    def pause(session_id: str):
        session = SESSIONS.get(session_id)
        if session:
            session.pause()

    @staticmethod
    def resume(session_id: str):
        session = SESSIONS.get(session_id)
        if session:
            session.resume()

    @staticmethod
    def end(session_id: str):
        close_session(session_id)

