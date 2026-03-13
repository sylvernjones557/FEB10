from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class StudentBase(BaseModel):
    name: str
    roll_no: Optional[str] = None
    email: Optional[str] = None
    external_id: Optional[str] = None
    avatar_url: Optional[str] = None


class StudentCreate(StudentBase):
    organization_id: Optional[UUID] = None  # Auto-filled from current user if missing
    group_id: UUID


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_no: Optional[str] = None
    email: Optional[str] = None
    external_id: Optional[str] = None
    avatar_url: Optional[str] = None
    group_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    face_data_registered: Optional[bool] = None


class Student(StudentBase):
    id: UUID
    organization_id: UUID
    group_id: UUID
    face_data_registered: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
