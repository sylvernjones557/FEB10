
from fastapi import APIRouter

from app.api.v1.endpoints import auth, organizations, groups, staff, students, timetable, attendance, recognition, stats, classes

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(timetable.router, prefix="/timetable", tags=["timetable"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(recognition.router, prefix="/recognition", tags=["recognition"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(classes.router, prefix="/classes", tags=["classes"])
