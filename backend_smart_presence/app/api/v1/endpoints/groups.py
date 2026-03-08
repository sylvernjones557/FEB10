from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.Group])
def read_groups(
    db: Session = Depends(get_db),
    organization_id: Optional[UUID] = Query(None),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    query = db.query(models.Group)
    if organization_id:
        query = query.filter(models.Group.organization_id == organization_id)
    return query.all()


@router.post("/", response_model=schemas.Group)
def create_group(
    *,
    db: Session = Depends(get_db),
    group_in: schemas.GroupCreate,
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    group = models.Group(
        organization_id=group_in.organization_id,
        name=group_in.name,
        code=group_in.code,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.get("/{group_id}", response_model=schemas.Group)
def read_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.patch("/{group_id}", response_model=schemas.Group)
def update_group(
    group_id: UUID,
    group_update: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    update_data = group_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}")
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    # Check for dependent students
    student_count = db.query(models.Student).filter(models.Student.group_id == group_id).count()
    if student_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete group: {student_count} student(s) still assigned")
    # Check for dependent timetable entries
    tt_count = db.query(models.Timetable).filter(models.Timetable.group_id == group_id).count()
    if tt_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete group: {tt_count} timetable entry(ies) still reference it")
    db.delete(group)
    db.commit()
    return {"message": "Group deleted"}


@router.get("/{group_id}/students", response_model=List[schemas.Student])
def read_group_students(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Check if this is the Test Class (addon feature)
    name = (group.name or "").lower()
    code = (group.code or "").lower()
    if "test" in name or code in ("test", "tst"):
        # For Test Class, show EVERY student in the organization
        return db.query(models.Student).filter(
            models.Student.organization_id == group.organization_id,
            models.Student.is_active == True
        ).all()
        
    students = db.query(models.Student).filter(models.Student.group_id == group_id).all()
    return students


@router.get("/{group_id}/timetable", response_model=List[schemas.Timetable])
def read_group_timetable(
    group_id: UUID,
    day_of_week: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    query = db.query(models.Timetable).filter(models.Timetable.group_id == group_id)
    if day_of_week:
        query = query.filter(models.Timetable.day_of_week == day_of_week)
    return query.order_by(models.Timetable.day_of_week, models.Timetable.period).all()
