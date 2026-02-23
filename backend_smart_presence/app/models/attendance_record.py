from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base


class AttendanceRecord(Base):
    """Individual attendance record for a student within a session."""
    __tablename__ = "attendance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    session_id = Column(UUID(as_uuid=True), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False, default="PRESENT")  # PRESENT, ABSENT
    method = Column(String, nullable=False, default="FACE")  # FACE, MANUAL
    marked_at = Column(DateTime(timezone=True), server_default=func.now())
