from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.Timetable])
def read_timetable(
    db: Session = Depends(get_db),
    group_id: Optional[UUID] = Query(None),
    staff_id: Optional[UUID] = Query(None),
    day_of_week: Optional[int] = Query(None),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    query = db.query(models.Timetable)
    if group_id:
        query = query.filter(models.Timetable.group_id == group_id)
    if staff_id:
        query = query.filter(models.Timetable.staff_id == staff_id)
    if day_of_week:
        query = query.filter(models.Timetable.day_of_week == day_of_week)
    return query.order_by(models.Timetable.day_of_week, models.Timetable.period).all()


@router.post("/", response_model=schemas.Timetable)
def create_timetable_entry(
    *,
    db: Session = Depends(get_db),
    entry_in: schemas.TimetableCreate,
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    # Verify group exists
    group = db.query(models.Group).filter(models.Group.id == entry_in.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    # Verify staff exists if provided
    if entry_in.staff_id:
        staff = db.query(models.Staff).filter(models.Staff.id == entry_in.staff_id).first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
    entry = models.Timetable(
        group_id=entry_in.group_id,
        day_of_week=entry_in.day_of_week,
        period=entry_in.period,
        subject=entry_in.subject,
        staff_id=entry_in.staff_id,
        start_time=entry_in.start_time,
        end_time=entry_in.end_time,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=schemas.Timetable)
def read_timetable_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    entry = db.query(models.Timetable).filter(models.Timetable.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    return entry


@router.patch("/{entry_id}", response_model=schemas.Timetable)
def update_timetable_entry(
    entry_id: UUID,
    entry_update: schemas.TimetableUpdate,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    entry = db.query(models.Timetable).filter(models.Timetable.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    update_data = entry_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_timetable_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    entry = db.query(models.Timetable).filter(models.Timetable.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Timetable entry deleted"}
