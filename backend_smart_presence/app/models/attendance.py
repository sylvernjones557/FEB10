import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from app.db.base_class import Base, StringUUID


class AttendanceSession(Base):
    """An attendance-taking session for a class/group."""
    __tablename__ = "attendance_sessions"

    id = Column(StringUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(StringUUID, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(StringUUID, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False, default="SCANNING")  # SCANNING, VERIFYING, COMPLETED
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
