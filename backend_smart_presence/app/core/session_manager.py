
from typing import Dict, List, Set, Optional
import threading
from datetime import datetime


class SessionManager:
    """
    Manages the active attendance session state in memory.
    Singleton pattern to ensure only one session runs at a time.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(SessionManager, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.active_session: Optional[dict] = None
        self.present_students: Set[str] = set()
        self.state: str = "IDLE"  # IDLE, SCANNING, VERIFYING, COMPLETED
        self.session_db_id: Optional[str] = None

    def force_reset(self):
        """Force-reset the session back to IDLE. Used by Test Class to allow unlimited sessions."""
        print(f"Force-reset session (was {self.state})")
        self.active_session = None
        self.session_db_id = None
        self.present_students = set()
        self.state = "IDLE"

    def start_session(self, created_by: str, group_id: str, session_db_id: str):
        if self.active_session:
            raise ValueError("Session already active")
        
        self.active_session = {
            "created_by": created_by,
            "group_id": group_id,
            "started_at": datetime.utcnow().isoformat()
        }
        self.session_db_id = session_db_id
        self.present_students = set()
        self.state = "SCANNING"
        print(f"Session started for Group {group_id}")

    def mark_present(self, student_id: str):
        if self.state != "SCANNING" and self.state != "VERIFYING":
            return
        
        if student_id not in self.present_students:
            self.present_students.add(student_id)
            print(f"Marked {student_id} as present")

    def stop_scanning(self):
        if self.state != "SCANNING":
            raise ValueError("Not currently scanning")
        self.state = "VERIFYING"

    def finalize(self):
        if self.state != "VERIFYING":
            raise ValueError("Must verify before finalizing")
        self.state = "COMPLETED"
        
        summary = {
            "session_id": self.session_db_id,
            "present_count": len(self.present_students),
            "present_ids": list(self.present_students)
        }
        
        # Reset
        self.active_session = None
        self.session_db_id = None
        self.present_students = set()
        self.state = "IDLE"
        
        return summary

    def get_status(self):
        return {
            "active": self.active_session is not None,
            "state": self.state,
            "session": self.active_session,
            "present_count": len(self.present_students),
            "present_list": list(self.present_students)
        }

session_manager = SessionManager()
