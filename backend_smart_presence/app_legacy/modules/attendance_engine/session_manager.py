from datetime import datetime, date
from typing import List, Optional

from app.modules.attendance_engine.engine import AttendanceEngine
from app.modules.ai_engine.identity_manager import IdentityManager
from app.modules.ai_engine.matcher import FaceMatcher
from app.modules.ai_engine.face_store import get_face_store
from app.core.supabase_client import supabase


class SessionManager:
    """
    Phase 9.3 – Session Manager (Orchestration Layer)

    Responsibilities:
    - One active session at a time
    - Own IdentityManager + AttendanceEngine
    - Enforce lifecycle:
        SCANNING → VERIFYING → VERIFIED → LOCKED
    - Persist finalized attendance to Supabase
    """

    def __init__(self):
        self.active: bool = False
        self.state: str = "IDLE"  # IDLE | SCANNING | VERIFYING | VERIFIED | LOCKED

        self.session_meta: Optional[dict] = None

        self.identity_manager: Optional[IdentityManager] = None
        self.attendance_engine: Optional[AttendanceEngine] = None

    # --------------------------------------------------
    # START SESSION (SCANNING)
    # --------------------------------------------------
    def start_session(self, staff_id: str, class_id: str, period: int) -> dict:
        if self.active:
            raise RuntimeError("Attendance session already active")

        # Fresh components per session
        face_store = get_face_store()
        matcher = FaceMatcher(face_store)

        self.identity_manager = IdentityManager(matcher)
        self.attendance_engine = AttendanceEngine()

        # Phase 9.3: real students will be fetched later
        self.attendance_engine.set_all_students([])

        self.session_meta = {
            "staff_id": staff_id,
            "class_id": class_id,
            "period": period,
            "started_at": datetime.utcnow()
        }

        self.active = True
        self.state = "SCANNING"

        return self.session_meta

    # --------------------------------------------------
    # STATUS
    # --------------------------------------------------
    def is_active(self) -> bool:
        return self.active

    def get_state(self) -> str:
        return self.state

    # --------------------------------------------------
    # STOP SCANNING → VERIFYING
    # --------------------------------------------------
    def stop_scanning(self) -> dict:
        self._require_active()
        self._require_state("SCANNING")

        self.state = "VERIFYING"

        present = self.attendance_engine.get_present_list()
        absent = self.attendance_engine.get_absent_list()

        return {
            "present": present,
            "absent": absent
        }

    # --------------------------------------------------
    # VERIFY (HUMAN-IN-THE-LOOP)
    # --------------------------------------------------
    def verify(
        self,
        manual_present: List[str],
        manual_absent: List[str]
    ):
        self._require_active()
        self._require_state("VERIFYING")

        for sid in manual_present:
            self.attendance_engine.mark_present(sid, manual=True)

        for sid in manual_absent:
            self.attendance_engine.mark_absent(sid, manual=True)

        self.state = "VERIFIED"

    # --------------------------------------------------
    # FINALIZE & PERSIST (LOCKED)
    # --------------------------------------------------
    def finalize(self) -> dict:
        self._require_active()
        self._require_state("VERIFIED")

        ended_at = datetime.utcnow()

        summary = {
            "staff_id": self.session_meta["staff_id"],
            "class_id": self.session_meta["class_id"],
            "period": self.session_meta["period"],
            "date": date.today().isoformat(),
            "started_at": self.session_meta["started_at"],
            "ended_at": ended_at,
            "present_list": self.attendance_engine.get_present_list(),
            "absent_list": self.attendance_engine.get_absent_list(),
            "present_count": self.attendance_engine.get_present_count()
        }

        # --------------------------------------------------
        # SAVE SESSION (attendance_sessions)
        # --------------------------------------------------
        session_row = {
            "staff_id": summary["staff_id"],
            "class_id": summary["class_id"],
            "period": summary["period"],
            "date": summary["date"],
            "started_at": summary["started_at"].isoformat(),
            "ended_at": summary["ended_at"].isoformat()
        }

        session_resp = (
            supabase
            .table("attendance_sessions")
            .insert(session_row)
            .execute()
        )

        session_id = session_resp.data[0]["id"]

        # --------------------------------------------------
        # SAVE RECORDS (attendance_records)
        # --------------------------------------------------
        records = []

        for sid in summary["present_list"]:
            records.append({
                "session_id": session_id,
                "student_id": sid,
                "status": "present"
            })

        for sid in summary["absent_list"]:
            records.append({
                "session_id": session_id,
                "student_id": sid,
                "status": "absent"
            })

        if records:
            supabase.table("attendance_records").insert(records).execute()

        # --------------------------------------------------
        # RESET STATE
        # --------------------------------------------------
        self.identity_manager = None
        self.attendance_engine = None
        self.session_meta = None

        self.active = False
        self.state = "LOCKED"

        return summary

    # --------------------------------------------------
    # INTERNAL GUARDS
    # --------------------------------------------------
    def _require_active(self):
        if not self.active:
            raise RuntimeError("No active session")

    def _require_state(self, expected: str):
        if self.state != expected:
            raise RuntimeError(
                f"Invalid session state: expected {expected}, got {self.state}"
            )
