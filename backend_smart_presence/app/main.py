
# Load environment variables from .env before any config import
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)

# ── CPU Performance: Set thread limits BEFORE importing any numerical libraries ──
_cpu_threads = os.getenv("ONNX_NUM_THREADS", "2")
os.environ.setdefault("OMP_NUM_THREADS", _cpu_threads)
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")
os.environ.setdefault("MKL_NUM_THREADS", _cpu_threads)
os.environ.setdefault("OPENBLAS_NUM_THREADS", _cpu_threads)
os.environ.setdefault("NUMEXPR_NUM_THREADS", _cpu_threads)
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
os.environ.setdefault("ONNXRUNTIME_PROVIDERS", "CPUExecutionProvider")

from fastapi import FastAPI
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings

# ── Detect Frontend (Unified Serving Mode) ──
_frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend_smart_presence", "dist")
_frontend_available = os.path.isdir(_frontend_dir) and os.path.isfile(os.path.join(_frontend_dir, "index.html"))
_frontend_index = os.path.join(_frontend_dir, "index.html") if _frontend_available else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Smart Presence Backend API - CPU-optimized for low-power systems. Local SQLite + InsightFace.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup():
    """Auto-create SQLite tables and seed initial data on first run."""
    from app.db.base import Base
    from app.db.session import engine, SessionLocal
    from app.models.organization import Organization
    from app.models.group import Group
    from app.models.staff import Staff
    from app.models.timetable import Timetable
    from app.core import security

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Only seed if the database is empty (first run)
        if db.query(Organization).first():
            return

        # ── Organization ──
        org = Organization(id="11111111-1111-1111-1111-111111111111", name="Green Valley School")
        db.add(org)
        db.flush()

        # ── Groups (Classes 1-5) ──
        class_ids = {
            1: "22222222-2222-2222-2222-222222222221",
            2: "22222222-2222-2222-2222-222222222222",
            3: "22222222-2222-2222-2222-222222222223",
            4: "22222222-2222-2222-2222-222222222224",
            5: "22222222-2222-2222-2222-222222222225",
        }
        for i in range(1, 6):
            db.add(Group(id=class_ids[i], organization_id=org.id, name=f"Class {i}", code=f"C{i}"))
        db.flush()

        # ── Staff ──
        staff_ids = {
            "STF001": "33333333-3333-3333-3333-333333333331",
            "STF002": "33333333-3333-3333-3333-333333333332",
            "STF003": "33333333-3333-3333-3333-333333333333",
        }
        db.add(Staff(id=staff_ids["STF001"], organization_id=org.id, name="Asha Raman",  email="asha@school.edu",   staff_code="STF001", role="STAFF", hashed_password=security.get_password_hash("password123"), is_active=True))
        db.add(Staff(id=staff_ids["STF002"], organization_id=org.id, name="Vikram Das",  email="vikram@school.edu", staff_code="STF002", role="STAFF", hashed_password=security.get_password_hash("password123"), is_active=True))
        db.add(Staff(id=staff_ids["STF003"], organization_id=org.id, name="Priya Sharma", email="priya@school.edu", staff_code="STF003", role="ADMIN", hashed_password=security.get_password_hash("password123"), is_active=True))
        # Admin superuser
        admin_staff = Staff(
            organization_id=org.id,
            staff_code="admin",
            name="Administrator",
            email="admin@smartpresence.edu",
            hashed_password=security.get_password_hash("admin"),
            role="ADMIN",
            is_superuser=True,
            is_active=True,
        )
        db.add(admin_staff)
        db.flush()

        # ── Test Class group + demo test staff (testclass/testclass) ──
        # Ensure a dedicated Test Class exists for unrestricted attendance sessions.
        test_group = db.query(Group).filter(
            Group.organization_id == org.id,
            (Group.name.ilike("%Test Class%")) | (Group.code.ilike("TEST"))
        ).first()
        if not test_group:
            test_group = Group(
                organization_id=org.id,
                name="Test Class",
                code="TEST",
                is_active=True,
            )
            db.add(test_group)
            db.flush()

        # Create a demo staff login for Test Class if it doesn't already exist.
        existing_test_staff = db.query(Staff).filter(Staff.staff_code == "testclass").first()
        if not existing_test_staff:
            test_staff = Staff(
                organization_id=org.id,
                name="Test Class Teacher",
                full_name="Test Class Teacher",
                email="testclass@school.edu",
                staff_code="testclass",
                role="STAFF",
                type="CLASS_TEACHER",
                assigned_class_id=test_group.id,
                avatar_url=None,
                is_active=True,
                is_superuser=False,
                hashed_password=security.get_password_hash("testclass"),
            )
            db.add(test_staff)

        # ── Timetable ──
        tt = [
            # Class 1 - Monday
            (class_ids[1], 1, 1, "Math",    staff_ids["STF001"], "09:00", "09:45"),
            (class_ids[1], 1, 2, "English",  staff_ids["STF002"], "10:00", "10:45"),
            (class_ids[1], 1, 3, "Science",  staff_ids["STF003"], "11:00", "11:45"),
            # Class 2 - Monday
            (class_ids[2], 1, 1, "English",  staff_ids["STF002"], "09:00", "09:45"),
            (class_ids[2], 1, 2, "Math",     staff_ids["STF001"], "10:00", "10:45"),
            (class_ids[2], 1, 3, "Art",      staff_ids["STF003"], "11:00", "11:45"),
            # Class 1 - Tuesday
            (class_ids[1], 2, 1, "Science",  staff_ids["STF003"], "09:00", "09:45"),
            (class_ids[1], 2, 2, "Math",     staff_ids["STF001"], "10:00", "10:45"),
            (class_ids[1], 2, 3, "English",  staff_ids["STF002"], "11:00", "11:45"),
            # Class 3 - Monday
            (class_ids[3], 1, 1, "Science",  staff_ids["STF003"], "09:00", "09:45"),
            (class_ids[3], 1, 2, "Math",     staff_ids["STF001"], "10:00", "10:45"),
        ]
        from datetime import time as dt_time
        for gid, dow, period, subject, sid, st, et in tt:
            sh, sm = map(int, st.split(":"))
            eh, em = map(int, et.split(":"))
            db.add(Timetable(group_id=gid, day_of_week=dow, period=period, subject=subject,
                             staff_id=sid, start_time=dt_time(sh, sm), end_time=dt_time(eh, em)))

        db.commit()
        print("[startup] SQLite database seeded with initial data.")
    except Exception as e:
        db.rollback()
        print(f"[startup] Seed error (may already exist): {e}")
    finally:
        db.close()


@app.get("/")
def read_root():
    if _frontend_available:
        return FileResponse(_frontend_index, media_type="text/html")
    return {
        "message": "Welcome to Smart Presence Backend",
        "status": "online",
        "version": "1.0.0",
        "mode": "CPU-optimized (low-power)",
        "docs_url": f"{settings.API_V1_STR}/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "device": "cpu", "mode": "low-power"}

@app.get("/system-info")
def system_info():
    import platform as _platform
    return {
        "device": "CPU-only",
        "database": "SQLite (local)",
        "face_model": settings.FACE_MODEL_NAME,
        "det_size": settings.FACE_DET_SIZE_CPU,
        "max_image_dim": settings.MAX_IMAGE_DIMENSION,
        "onnx_threads": settings.ONNX_NUM_THREADS,
        "lazy_load": settings.LAZY_LOAD_ENGINE,
        "env_omp_threads": os.environ.get("OMP_NUM_THREADS"),
        "env_cuda_visible": os.environ.get("CUDA_VISIBLE_DEVICES", "(not set)"),
        "frontend_mode": "unified (Docker)" if _frontend_available else "standalone (API only)",
        "python_version": _platform.python_version(),
        "platform": _platform.platform(),
    }


# ── Frontend Static Files (Docker Unified Mode) ──
if _frontend_available:
    import mimetypes

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        file_path = os.path.join(_frontend_dir, full_path)
        if full_path and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            return FileResponse(file_path, media_type=mime_type)
        return FileResponse(_frontend_index, media_type="text/html")
