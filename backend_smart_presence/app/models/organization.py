from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base


class Organization(Base):
    """School / institution."""
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
