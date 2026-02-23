from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()


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
    # Verify group exists
    group = db.query(models.Group).filter(models.Group.id == student_in.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    org_id = student_in.organization_id or current_user.organization_id
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
    db.delete(student)
    db.commit()
    return {"message": "Student deleted"}
