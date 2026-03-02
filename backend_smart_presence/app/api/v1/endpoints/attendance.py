"""Attendance session management endpoints — start, status, stop, verify, finalize."""
from typing import Any, List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.db.session import get_db
from app.core.session_manager import session_manager
from app.models.attendance import AttendanceSession
from app.models.attendance_record import AttendanceRecord

router = APIRouter()


def _is_test_class(group: models.Group) -> bool:
    """Check if a group is the special Test Class (bypasses all restrictions)."""
    name = (group.name or "").lower()
    code = (group.code or "").lower() if hasattr(group, "code") else ""
    return "test" in name or code in ("test", "tst")


@router.post("/start")
def start_session(
    *,
    db: Session = Depends(get_db),
    body: schemas.AttendanceSessionCreate,
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Start a new attendance scanning session for a group."""
    # Verify group exists
    group = db.query(models.Group).filter(models.Group.id == body.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    is_test = _is_test_class(group)

    # For Test Class: auto-reset any previous session so staff can take attendance unlimited times
    if is_test and session_manager.state != "IDLE":
        session_manager.force_reset()

    # Check no session already active (non-test classes)
    if session_manager.state != "IDLE":
        raise HTTPException(status_code=400, detail="A session is already active")

    # Create DB record
    db_session = AttendanceSession(
        group_id=body.group_id,
        created_by=current_user.id,
        status="SCANNING",
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    # Start in-memory session — keep UUIDs for DB compat
    session_manager.start_session(
        created_by=str(current_user.id),
        group_id=body.group_id,
        session_db_id=db_session.id,
    )

    return {
        "message": "Session started",
        "session_id": str(db_session.id),
        "group_id": str(body.group_id),
        "state": "SCANNING",
    }


@router.get("/status")
def get_status(
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Get the current attendance session status."""
    return session_manager.get_status()


@router.post("/stop")
def stop_scanning(
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Stop the scanning phase, move to VERIFYING."""
    try:
        session_manager.stop_scanning()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Scanning stopped", "state": "VERIFYING"}


@router.post("/verify")
def verify_attendance(
    *,
    db: Session = Depends(get_db),
    body: schemas.AttendanceVerifyRequest,
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Apply manual adjustments (add present, remove present)."""
    if session_manager.state not in ("SCANNING", "VERIFYING"):
        raise HTTPException(status_code=400, detail="No active session to verify")

    for sid in body.manual_present:
        session_manager.mark_present(sid)
    for sid in body.manual_absent:
        session_manager.present_students.discard(sid)

    return {
        "message": "Adjustments applied",
        "present_count": len(session_manager.present_students),
        "present_list": list(session_manager.present_students),
    }


@router.post("/finalize")
def finalize_session(
    *,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Finalize the session and persist attendance records to DB."""
    if session_manager.state == "IDLE":
        raise HTTPException(status_code=400, detail="No active session to finalize")

    # If still scanning, stop first
    if session_manager.state == "SCANNING":
        session_manager.stop_scanning()

    session_db_id = session_manager.session_db_id
    group_id = session_manager.active_session["group_id"] if session_manager.active_session else None
    present_ids = list(session_manager.present_students)

    try:
        summary = session_manager.finalize()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update DB session status
    if session_db_id:
        db_session = db.query(AttendanceSession).filter(
            AttendanceSession.id == session_db_id
        ).first()
        if db_session:
            db_session.status = "COMPLETED"
            db_session.ended_at = datetime.utcnow()

    # Get all students in the group to create ABSENT records too
    # For Test Class, include ALL students across all groups
    all_students = []
    if group_id:
        group = db.query(models.Group).filter(models.Group.id == group_id).first()
        if group and _is_test_class(group):
            all_students = db.query(models.Student).filter(
                models.Student.is_active == True,
            ).all()
        else:
            all_students = db.query(models.Student).filter(
                models.Student.group_id == group_id,
                models.Student.is_active == True,
            ).all()

    # Create attendance records
    for student in all_students:
        sid = str(student.id)
        record = AttendanceRecord(
            session_id=session_db_id,
            student_id=student.id,
            status="PRESENT" if sid in present_ids else "ABSENT",
            method="FACE" if sid in present_ids else "MANUAL",
        )
        db.add(record)

    db.commit()

    # Collect present student names for the summary
    present_details = []
    for student in all_students:
        sid = str(student.id)
        if sid in present_ids:
            present_details.append({"id": sid, "name": student.name})

    return {
        "message": "Session finalized",
        "session_id": session_db_id,
        "present_count": len(present_ids),
        "total_students": len(all_students),
        "present_details": present_details,
    }


@router.get("/history/weekly/{staff_id}")
def get_weekly_history(
    staff_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    """Get attendance session history for a staff member over the past 7 days."""
    from datetime import timedelta

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.created_by == staff_id,
        AttendanceSession.started_at >= week_ago,
        AttendanceSession.status == "COMPLETED",
    ).all()

    # Group by date
    days = {}
    for s in sessions:
        date_str = s.started_at.strftime("%Y-%m-%d") if s.started_at else "unknown"
        if date_str not in days:
            days[date_str] = {"date": date_str, "sessions_count": 0, "total_present": 0, "total_students": 0}
        days[date_str]["sessions_count"] += 1

        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).all()
        days[date_str]["total_students"] += len(records)
        days[date_str]["total_present"] += len([r for r in records if r.status == "PRESENT"])

    return {
        "staff_id": str(staff_id),
        "week": list(days.values()),
    }
