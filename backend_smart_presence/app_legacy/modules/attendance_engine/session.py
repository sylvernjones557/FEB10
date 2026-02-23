import time
from typing import Dict, Set


class PersonSession:
    """
    Tracks a single person's presence during a session
    """

    def __init__(self, person_id: str):
        self.person_id = person_id
        self.first_seen = time.time()
        self.last_seen = self.first_seen
        self.match_count = 0
        self.best_confidence = 0.0
        self.present = False

    def update(self, confidence: float):
        self.last_seen = time.time()
        self.match_count += 1

        if confidence > self.best_confidence:
            self.best_confidence = confidence

        self.present = True

    # ----------------------------
    # Serialization (Redis / Memory)
    # ----------------------------
    def to_dict(self) -> dict:
        return {
            "person_id": self.person_id,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "match_count": self.match_count,
            "best_confidence": self.best_confidence,
            "present": self.present,
        }

    @classmethod
    def from_dict(cls, data: dict):
        obj = cls(data["person_id"])
        obj.first_seen = data["first_seen"]
        obj.last_seen = data["last_seen"]
        obj.match_count = data["match_count"]
        obj.best_confidence = data["best_confidence"]
        obj.present = data["present"]
        return obj


class AttendanceSession:
    """
    Phase 7.2 – Session Intelligence Layer

    Handles:
    - per-person tracking
    - confidence filtering
    - deduplication
    - summary generation

    Used by AttendanceEngine (NOT lifecycle)
    """

    CONFIDENCE_THRESHOLD = 0.6

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.started_at = time.time()
        self.last_updated = self.started_at

        self.present_students: Dict[str, PersonSession] = {}
        self.duplicates: Set[str] = set()
        self.flagged_low_confidence: Set[str] = set()

    # ----------------------------
    # Recognition intake
    # ----------------------------
    def add_recognition_event(self, person_id: str, confidence: float):
        self.last_updated = time.time()

        # Low confidence → flagged, not counted
        if confidence < self.CONFIDENCE_THRESHOLD:
            self.flagged_low_confidence.add(person_id)
            return

        # First time seen
        if person_id not in self.present_students:
            self.present_students[person_id] = PersonSession(person_id)
        else:
            # Seen again → duplicate
            self.duplicates.add(person_id)

        self.present_students[person_id].update(confidence)

    # ----------------------------
    # Queries
    # ----------------------------
    def get_present_ids(self):
        return list(self.present_students.keys())

    def get_present_count(self):
        return len(self.present_students)

    # ----------------------------
    # Summary
    # ----------------------------
    def get_summary(self):
        return {
            "session_id": self.session_id,
            "started_at": self.started_at,
            "last_updated": self.last_updated,
            "present_count": self.get_present_count(),
            "duplicates": list(self.duplicates),
            "low_confidence": list(self.flagged_low_confidence),
            "students": {
                pid: ps.to_dict()
                for pid, ps in self.present_students.items()
            }
        }

    # ----------------------------
    # Serialization (optional)
    # ----------------------------
    def to_dict(self):
        return {
            "session_id": self.session_id,
            "started_at": self.started_at,
            "last_updated": self.last_updated,
            "present_students": {
                pid: ps.to_dict()
                for pid, ps in self.present_students.items()
            },
            "duplicates": list(self.duplicates),
            "flagged_low_confidence": list(self.flagged_low_confidence),
        }

    @classmethod
    def from_dict(cls, data: dict):
        session = cls(data["session_id"])
        session.started_at = data["started_at"]
        session.last_updated = data["last_updated"]

        for pid, ps_data in data.get("present_students", {}).items():
            session.present_students[pid] = PersonSession.from_dict(ps_data)

        session.duplicates = set(data.get("duplicates", []))
        session.flagged_low_confidence = set(
            data.get("flagged_low_confidence", [])
        )

        return session
