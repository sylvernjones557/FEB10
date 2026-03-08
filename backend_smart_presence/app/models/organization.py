import uuid
from sqlalchemy import Column, String, DateTime, func
from app.db.base_class import Base, StringUUID


class Organization(Base):
    """School / institution."""
    __tablename__ = "organizations"

    id = Column(StringUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
