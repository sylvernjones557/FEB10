"""Class schedule and live class endpoints."""
from typing import Any, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.db.session import get_db

router = APIRouter()


@router.get("/live")
def get_live_classes(
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Get currently active classes based on timetable and current time."""
    now = datetime.utcnow()
    # Python: Monday=0, isoweekday: Monday=1
    day_of_week = now.isoweekday()
    current_time = now.time()

    org_id = current_user.organization_id
    entries = (
        db.query(models.Timetable)
        .join(models.Group, models.Group.id == models.Timetable.group_id)
        .filter(
            models.Timetable.day_of_week == day_of_week,
            models.Group.organization_id == org_id,
        )
        .all()
    )

    live = []
    for entry in entries:
        # Check if current time is within the period
        if entry.start_time and entry.end_time:
            if entry.start_time <= current_time <= entry.end_time:
                group = db.query(models.Group).filter(models.Group.id == entry.group_id).first()
                staff = db.query(models.Staff).filter(models.Staff.id == entry.staff_id).first() if entry.staff_id else None
                live.append({
                    "group_id": str(entry.group_id),
                    "group_name": group.name if group else "Unknown",
                    "subject": entry.subject,
                    "period": entry.period,
                    "teacher_name": staff.name if staff else "TBD",
                    "start_time": entry.start_time.isoformat() if entry.start_time else None,
                    "end_time": entry.end_time.isoformat() if entry.end_time else None,
                })

    return live


@router.get("/{class_id}/schedule/today")
def get_class_schedule_today(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Get today's schedule for a specific class."""
    # Verify group exists
    group = db.query(models.Group).filter(models.Group.id == class_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Class not found")

    day_of_week = datetime.utcnow().isoweekday()

    entries = db.query(models.Timetable).filter(
        models.Timetable.group_id == class_id,
        models.Timetable.day_of_week == day_of_week,
    ).order_by(models.Timetable.period).all()

    result = []
    for entry in entries:
        staff = db.query(models.Staff).filter(models.Staff.id == entry.staff_id).first() if entry.staff_id else None
        result.append({
            "id": str(entry.id),
            "period": entry.period,
            "subject": entry.subject,
            "teacher_name": staff.name if staff else "TBD",
            "staff_id": str(entry.staff_id) if entry.staff_id else None,
            "time": f"{entry.start_time.strftime('%H:%M') if entry.start_time else '?'} - {entry.end_time.strftime('%H:%M') if entry.end_time else '?'}",
            "start_time": entry.start_time.isoformat() if entry.start_time else None,
            "end_time": entry.end_time.isoformat() if entry.end_time else None,
        })

    return result
