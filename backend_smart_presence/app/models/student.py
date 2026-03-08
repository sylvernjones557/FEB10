import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from app.db.base_class import Base, StringUUID


class Student(Base):
    """Student enrolled in a class/group."""
    __tablename__ = "students"

    id = Column(StringUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(StringUUID, ForeignKey("organizations.id"), nullable=False, index=True)
    group_id = Column(StringUUID, ForeignKey("groups.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    roll_no = Column(String, nullable=True)
    email = Column(String, nullable=True)
    external_id = Column(String, nullable=True)
    face_data_registered = Column(Boolean, default=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
