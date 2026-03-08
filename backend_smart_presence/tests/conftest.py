
import os
from dotenv import load_dotenv
import pytest
from uuid import uuid4
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.base import Base
from app.main import app
from app.db.session import get_db
from app.core import security

# Load environment variables from .env for tests
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)

# Use in-memory SQLite for tests (fast, isolated)
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///")

engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False},
)

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin_token_headers(client, db):
    from app.models.staff import Staff
    from app.models.organization import Organization
    from uuid import uuid4

    # Create organization
    org = Organization(id=uuid4(), name="Test Org")
    db.add(org)
    db.commit()

    admin_data = {
        "id": uuid4(),
        "organization_id": org.id,
        "staff_code": f"admin_test_{uuid4().hex[:8]}",
        "name": "Test Admin",
        "full_name": "Test Admin",
        "email": f"admin_test_{uuid4().hex[:8]}@test.com",
        "hashed_password": security.get_password_hash("testpass"),
        "is_superuser": True,
        "is_active": True,
        "role": "ADMIN",
    }
    staff = Staff(**admin_data)
    db.add(staff)
    db.commit()

    login_data = {"username": admin_data["staff_code"], "password": "testpass"}
    r = client.post("/api/v1/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}
    return headers
