from datetime import datetime
from typing import List, Set


class AttendanceEngine:
    """
    Phase 6.3 → Phase 9.3 – Attendance Engine

    Responsibility:
    - Track attendance during a single live session
    - Maintain present students
    - Support AI + manual marking
    - Derive absentees when full class list is known
    """

    def __init__(self):
        # Students detected as present
        self.present_ids: Set[str] = set()

        # Timestamp when student was first marked present
        self.present_log = {}

        # All students of the class (used to compute absentees)
        self.all_students: Set[str] = set()

    # --------------------------------------------------
    # SESSION INITIALIZATION
    # --------------------------------------------------
    def set_all_students(self, student_ids: List[str]) -> None:
        """
        Set the complete list of student IDs for this class.
        Must be called ONCE at session start.
        """
        self.all_students = set(student_ids)

    # --------------------------------------------------
    # MARK ATTENDANCE (AI or MANUAL)
    # --------------------------------------------------
    def mark_present(self, person_id: str, manual: bool = False) -> bool:
        """
        Mark a student as present.

        Args:
            person_id: student identifier
            manual: True if marked by staff (Phase 9.3 verification)

        Returns:
            True  -> newly marked present
            False -> already present
        """

        if person_id in self.present_ids:
            return False

        self.present_ids.add(person_id)
        self.present_log[person_id] = {
            "marked_at": datetime.utcnow(),
            "manual": manual
        }
        return True

    def mark_absent(self, person_id: str, manual: bool = False) -> bool:
        """
        Manually mark a student as absent (verification override).

        Returns:
            True  -> student removed from present list
            False -> student was not present
        """

        if person_id not in self.present_ids:
            return False

        self.present_ids.remove(person_id)
        self.present_log[person_id] = {
            "marked_at": datetime.utcnow(),
            "manual": manual
        }
        return True

    # --------------------------------------------------
    # GETTERS
    # --------------------------------------------------
    def get_present_count(self) -> int:
        return len(self.present_ids)

    def get_present_list(self) -> List[str]:
        return list(self.present_ids)

    def get_absent_list(self) -> List[str]:
        """
        Absentees = all_students - present_students

        Safe behavior:
        - If all_students is empty, returns empty list
        """
        if not self.all_students:
            return []

        return list(self.all_students - self.present_ids)
