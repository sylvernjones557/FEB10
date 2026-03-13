"""Stats and schedule endpoints for the dashboard."""
from typing import Any, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.db.session import get_db
from app.models.attendance import AttendanceSession
from app.models.attendance_record import AttendanceRecord

router = APIRouter()


@router.get("/institutional")
def get_institutional_stats(
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Aggregate institutional statistics for the dashboard."""
    org_id = current_user.organization_id

    total_students = db.query(models.Student).filter(
        models.Student.organization_id == org_id,
        models.Student.is_active == True,
    ).count()

    total_staff = db.query(models.Staff).filter(
        models.Staff.organization_id == org_id,
        models.Staff.is_active == True,
        models.Staff.role != "ADMIN",
    ).count()

    total_classes = db.query(models.Group).filter(
        models.Group.organization_id == org_id,
        models.Group.is_active == True,
    ).count()

    # Today's attendance stats — filter by org via group_id join
    today = datetime.utcnow().date()
    from sqlalchemy import func, cast, Date
    today_sessions = (
        db.query(AttendanceSession)
        .join(models.Group, models.Group.id == AttendanceSession.group_id)
        .filter(
            AttendanceSession.status == "COMPLETED",
            models.Group.organization_id == org_id,
            cast(AttendanceSession.started_at, Date) == today,
        )
        .all()
    )

    today_present = 0
    today_total = 0
    if today_sessions:
        session_ids = [s.id for s in today_sessions]
        today_total = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.session_id.in_(session_ids)
        ).scalar() or 0
        today_present = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.session_id.in_(session_ids),
            AttendanceRecord.status == "PRESENT",
        ).scalar() or 0

    attendance_rate = round((today_present / today_total * 100) if today_total > 0 else 0, 1)

    return {
        "total_students": total_students,
        "total_staff": total_staff,
        "total_classes": total_classes,
        "today_attendance_rate": attendance_rate,
        "today_present": today_present,
        "today_total": today_total,
        "sessions_today": len(today_sessions),
    }
