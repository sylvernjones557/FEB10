from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.core import security
from app.db.session import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.Staff])
def read_staff(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    return db.query(models.Staff).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.Staff)
def create_staff(
    *,
    db: Session = Depends(get_db),
    staff_in: schemas.StaffCreate,
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    existing = db.query(models.Staff).filter(
        models.Staff.staff_code == staff_in.staff_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Staff code already exists.")
    org_id = staff_in.organization_id or current_user.organization_id
    staff = models.Staff(
        organization_id=org_id,
        name=staff_in.name,
        full_name=staff_in.full_name or staff_in.name,
        email=staff_in.email,
        staff_code=staff_in.staff_code,
        role=staff_in.role or "STAFF",
        type=staff_in.type or "SUBJECT_TEACHER",
        primary_subject=staff_in.primary_subject,
        assigned_class_id=staff_in.assigned_class_id,
        avatar_url=staff_in.avatar_url,
        hashed_password=security.get_password_hash(staff_in.password),
        is_active=True,
        is_superuser=False,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/me", response_model=schemas.Staff)
def read_staff_me(
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    return current_user


@router.get("/{staff_id}", response_model=schemas.Staff)
def read_staff_by_id(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff


@router.patch("/{staff_id}", response_model=schemas.Staff)
def update_staff(
    staff_id: UUID,
    staff_update: schemas.StaffUpdate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if not current_user.is_superuser and current_user.id != staff_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    update_data = staff_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        if update_data["password"]:
            staff.hashed_password = security.get_password_hash(update_data["password"])
        del update_data["password"]
    for field, value in update_data.items():
        setattr(staff, field, value)
    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/{staff_id}")
def delete_staff(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if staff.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    # Check for dependent timetable entries
    tt_count = db.query(models.Timetable).filter(models.Timetable.staff_id == staff_id).count()
    if tt_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete staff: {tt_count} timetable entry(ies) still reference them")
    db.delete(staff)
    db.commit()
    return {"message": "Staff deleted"}
