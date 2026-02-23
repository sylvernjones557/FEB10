
import os
import pytest
from uuid import uuid4
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.base import Base
from app.main import app
from app.db.session import get_db
from app.core import security

# Use the same Supabase DB for tests, or override with TEST_DATABASE_URL
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:OCT%40142310_jones@db.gnvarelitiufeevowaru.supabase.co:5432/postgres",
)

engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    yield engine


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
    from app.models.user import User

    admin_data = {
        "user_id": uuid4(),
        "staff_code": "admin_test",
        "full_name": "Test Admin",
        "email": "admin_test@test.com",
        "hashed_password": security.get_password_hash("testpass"),
        "is_superuser": True,
        "is_active": True,
        "role": "ADMIN",
    }
    user = User(**admin_data)
    db.add(user)
    db.commit()

    login_data = {"username": "admin_test", "password": "testpass"}
    r = client.post("/api/v1/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}
    return headers
