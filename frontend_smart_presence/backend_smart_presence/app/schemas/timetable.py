from typing import Optional
from uuid import UUID
from datetime import time, datetime
from pydantic import BaseModel


class TimetableBase(BaseModel):
    day_of_week: int  # 1=Mon ... 7=Sun
    period: int
    subject: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class TimetableCreate(TimetableBase):
    group_id: UUID
    staff_id: Optional[UUID] = None


class TimetableUpdate(BaseModel):
    day_of_week: Optional[int] = None
    period: Optional[int] = None
    subject: Optional[str] = None
    staff_id: Optional[UUID] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class Timetable(TimetableBase):
    id: UUID
    group_id: UUID
    staff_id: Optional[UUID] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
