from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    pass


class Organization(OrganizationBase):
    id: UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
