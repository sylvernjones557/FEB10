from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()


def _is_test_class(group: models.Group) -> bool:
    """Helper to detect the special Test Class."""
    name = (group.name or "").lower()
    code = (group.code or "").lower()
    return "test" in name or code in ("test", "tst")


@router.get("/", response_model=List[schemas.Student])
def read_students(
    db: Session = Depends(get_db),
    group_id: Optional[UUID] = Query(None),
    organization_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    query = db.query(models.Student)
    if group_id:
        # Check if this is the Test Class (addon feature)
        group = db.query(models.Group).filter(models.Group.id == group_id).first()
        if group and _is_test_class(group):
            # For Test Class, include EVERY active student in the organization
            query = query.filter(models.Student.organization_id == group.organization_id)
        else:
            query = query.filter(models.Student.group_id == group_id)
            
    if organization_id:
        query = query.filter(models.Student.organization_id == organization_id)
        
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.Student)
def create_student(
    *,
    db: Session = Depends(get_db),
    student_in: schemas.StudentCreate,
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    # Verify primary group exists
    group = db.query(models.Group).filter(models.Group.id == student_in.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    org_id = student_in.organization_id or current_user.organization_id

    # ── Test Class Add-on Feature ─────────────────────────────────────────
    # Ensure a "Test Class" exists for this organization.
    # All students automatically "belong" to this class for unrestricted testing.
    test_group = db.query(models.Group).filter(
        models.Group.organization_id == org_id,
        (models.Group.name.ilike("%Test Class%")) | (models.Group.code.ilike("TEST"))
    ).first()
    
    if not test_group:
        test_group = models.Group(
            organization_id=org_id,
            name="Test Class",
            code="TEST",
            is_active=True
        )
        db.add(test_group)
        db.flush() # Secure ID for logging or future use
    # ──────────────────────────────────────────────────────────────────────

    student = models.Student(
        organization_id=org_id,
        group_id=student_in.group_id,
        name=student_in.name,
        roll_no=student_in.roll_no,
        email=student_in.email,
        external_id=student_in.external_id,
        avatar_url=student_in.avatar_url,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/{student_id}", response_model=schemas.Student)
def read_student(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=schemas.Student)
def update_student(
    student_id: UUID,
    student_update: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    update_data = student_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}")
def delete_student(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Also remove face embeddings from vector store
    try:
        from app.db.vector_store import vector_store
        vector_store.delete_student_faces(str(student_id))
    except Exception as e:
        # Log but don't block deletion if vector cleanup fails
        import logging
        logging.getLogger(__name__).warning(f"Failed to clean face data for student {student_id}: {e}")

    # Delete any attendance records for this student
    try:
        db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == student_id
        ).delete(synchronize_session=False)
    except Exception:
        pass  # Table might not exist or no records

    db.delete(student)
    db.commit()
    return {"message": "Student deleted successfully", "student_id": str(student_id)}
