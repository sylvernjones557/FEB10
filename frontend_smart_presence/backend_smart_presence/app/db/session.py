
import os
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Ensure the directory for the SQLite file exists
_db_url = settings.DATABASE_URL
if _db_url.startswith("sqlite"):
    _db_path = _db_url.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(os.path.abspath(_db_path)) if os.path.dirname(_db_path) else ".", exist_ok=True)

engine = create_engine(
    _db_url,
    connect_args={"check_same_thread": False} if _db_url.startswith("sqlite") else {},
    pool_pre_ping=True,
)

# Enable WAL mode and foreign keys for SQLite
if _db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
