from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class StaffBase(BaseModel):
    name: str
    email: Optional[str] = None
    staff_code: Optional[str] = None
    role: Optional[str] = "STAFF"
    type: Optional[str] = "SUBJECT_TEACHER"  # CLASS_TEACHER | SUBJECT_TEACHER
    primary_subject: Optional[str] = None
    assigned_class_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    full_name: Optional[str] = None


class StaffCreate(StaffBase):
    organization_id: Optional[UUID] = None  # Auto-filled from current user if missing
    password: str
    name: str
    staff_code: str


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None
    primary_subject: Optional[str] = None
    assigned_class_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class Staff(StaffBase):
    id: UUID
    organization_id: UUID
    is_active: bool = True
    is_superuser: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
