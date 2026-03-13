import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from app.db.base_class import Base, StringUUID


class AttendanceRecord(Base):
    """Individual attendance record for a student within a session."""
    __tablename__ = "attendance_records"

    id = Column(StringUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(StringUUID, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(StringUUID, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False, default="PRESENT")  # PRESENT, ABSENT
    method = Column(String, nullable=False, default="FACE")  # FACE, MANUAL
    marked_at = Column(DateTime, server_default=func.now())
