import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from app.db.base_class import Base, StringUUID


class Staff(Base):
    """Staff member / teacher in the school."""
    __tablename__ = "staff"

    id = Column(StringUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(StringUUID, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    staff_code = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, default="STAFF")  # ADMIN, STAFF
    type = Column(String, default="SUBJECT_TEACHER")  # CLASS_TEACHER, SUBJECT_TEACHER
    primary_subject = Column(String, nullable=True)
    assigned_class_id = Column(StringUUID, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    avatar_url = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
