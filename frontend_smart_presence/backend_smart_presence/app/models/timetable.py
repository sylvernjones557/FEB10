import uuid
from sqlalchemy import Column, String, Integer, Time, DateTime, ForeignKey, CheckConstraint, func
from app.db.base_class import Base, StringUUID


class Timetable(Base):
    """Period/slot in a class schedule."""
    __tablename__ = "timetable"

    id = Column(StringUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(StringUUID, ForeignKey("groups.id"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 1=Mon ... 7=Sun
    period = Column(Integer, nullable=False)
    subject = Column(String, nullable=False)
    staff_id = Column(StringUUID, ForeignKey("staff.id"), nullable=True, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="ck_timetable_dow"),
    )
