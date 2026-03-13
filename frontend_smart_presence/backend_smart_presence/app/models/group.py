import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from app.db.base_class import Base, StringUUID


class Group(Base):
    """Class / section within a school."""
    __tablename__ = "groups"

    id = Column(StringUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(StringUUID, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
