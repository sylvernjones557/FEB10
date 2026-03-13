from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class GroupBase(BaseModel):
    name: str
    code: Optional[str] = None


class GroupCreate(GroupBase):
    organization_id: UUID


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None


class Group(GroupBase):
    id: UUID
    organization_id: UUID
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
