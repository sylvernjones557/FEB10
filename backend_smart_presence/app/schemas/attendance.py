from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


# ── Attendance Session ──

class AttendanceSessionCreate(BaseModel):
    group_id: UUID


class AttendanceSession(BaseModel):
    id: UUID
    group_id: UUID
    created_by: UUID
    status: str  # SCANNING, VERIFYING, COMPLETED
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttendanceSessionStatus(BaseModel):
    active: bool
    state: str
    session: Optional[AttendanceSession] = None
    present_count: int = 0
    present_list: List[str] = []


# ── Attendance Record ──

class AttendanceRecordCreate(BaseModel):
    session_id: UUID
    student_id: UUID
    status: str = "PRESENT"
    method: str = "FACE"


class AttendanceRecord(BaseModel):
    id: UUID
    session_id: UUID
    student_id: UUID
    status: str
    method: str
    marked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Verify Payload ──

class AttendanceVerifyRequest(BaseModel):
    manual_present: List[str] = []
    manual_absent: List[str] = []


# ── Weekly History ──

class DayAttendance(BaseModel):
    date: str
    sessions_count: int
    total_present: int
    total_students: int


class WeeklyHistory(BaseModel):
    staff_id: str
    week: List[DayAttendance] = []
