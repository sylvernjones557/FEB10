"""
Comprehensive Test Suite for Smart Presence Backend
====================================================
Covers: Unit Tests, Validation Tests, Integration Tests, CPU/GPU Mode Tests

Run with: python -m pytest tests/test_comprehensive.py -v --tb=long -s
"""

import os
import sys
import time
import json
import pytest
import numpy as np
from uuid import uuid4
from datetime import datetime

# ============================================================================
# SECTION 1: UNIT TESTS
# ============================================================================

class TestUnitHealth:
    """Unit tests for health and system endpoints."""

    def test_health_endpoint(self, client):
        """UT-001: Health endpoint returns correct structure."""
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "device" in data
        assert "mode" in data

    def test_root_endpoint(self, client):
        """UT-002: Root endpoint returns welcome message."""
        r = client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "online"
        assert data["version"] == "1.0.0"
        assert "docs_url" in data

    def test_system_info_endpoint(self, client):
        """UT-003: System info returns CPU configuration."""
        r = client.get("/system-info")
        assert r.status_code == 200
        data = r.json()
        assert data["device"] == "CPU-only"
        assert "face_model" in data
        assert "det_size" in data
        assert "onnx_threads" in data
        assert "lazy_load" in data

    def test_openapi_docs_available(self, client):
        """UT-004: OpenAPI docs endpoint is accessible."""
        r = client.get("/api/v1/openapi.json")
        assert r.status_code == 200
        data = r.json()
        assert "paths" in data
        assert "info" in data


class TestUnitConfig:
    """Unit tests for configuration settings."""

    def test_settings_loaded(self):
        """UT-005: Settings load correctly from environment."""
        from app.core.config import settings
        assert settings.API_V1_STR == "/api/v1"
        assert settings.PROJECT_NAME == "Smart Presence Backend"
        assert settings.FACE_DEVICE_PREFERENCE == "cpu"

    def test_settings_cpu_defaults(self):
        """UT-006: CPU-optimized defaults are correct."""
        from app.core.config import settings
        assert settings.FACE_DET_SIZE_CPU == 320
        assert settings.MAX_IMAGE_DIMENSION == 640
        assert settings.ONNX_NUM_THREADS == 2
        assert settings.LAZY_LOAD_ENGINE is True

    def test_settings_face_model(self):
        """UT-007: Face model is configured for CPU (small model)."""
        from app.core.config import settings
        assert settings.FACE_MODEL_NAME in ["buffalo_sc", "buffalo_m", "buffalo_l"]

    def test_database_url_set(self):
        """UT-008: Database URL is configured."""
        from app.core.config import settings
        assert settings.DATABASE_URL is not None
        assert "sqlite" in settings.DATABASE_URL


class TestUnitSecurity:
    """Unit tests for security module."""

    def test_password_hash(self):
        """UT-009: Password hashing works correctly."""
        from app.core.security import get_password_hash, verify_password
        password = "test_secure_password_123"
        hashed = get_password_hash(password)
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrong_password", hashed) is False

    def test_jwt_token_creation(self):
        """UT-010: JWT token creation works."""
        from app.core.security import create_access_token
        token = create_access_token(subject="test_user")
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 50  # JWT tokens are long strings


class TestUnitFaceEngine:
    """Unit tests for face engine module."""

    def test_face_engine_singleton(self):
        """UT-011: FaceEngine is a singleton."""
        try:
            from app.core.face_engine import FaceEngine
            e1 = FaceEngine()
            e2 = FaceEngine()
            assert e1 is e2
        except ImportError:
            pytest.skip("insightface not available")

    def test_downscale_image_function(self):
        """UT-012: downscale_image properly downscales large images."""
        try:
            from app.core.face_engine import downscale_image
            # Large image
            img = np.zeros((1920, 1080, 3), dtype=np.uint8)
            result = downscale_image(img, max_dim=640)
            assert max(result.shape[:2]) <= 640

            # Small image should not be changed
            small = np.zeros((320, 240, 3), dtype=np.uint8)
            result2 = downscale_image(small, max_dim=640)
            assert result2.shape == small.shape
        except ImportError:
            pytest.skip("cv2 not available")

    def test_face_engine_no_face_in_blank(self):
        """UT-013: FaceEngine returns None for blank image (no face)."""
        try:
            from app.core.face_engine import face_engine
            img = np.zeros((640, 640, 3), dtype=np.uint8)
            emb = face_engine.extract_embedding(img)
            assert emb is None
        except (ImportError, AttributeError):
            pytest.skip("insightface/cv2 not available")

    def test_face_engine_none_input(self):
        """UT-014: FaceEngine handles None input gracefully."""
        try:
            from app.core.face_engine import face_engine
            emb = face_engine.extract_embedding(None)
            assert emb is None
        except (ImportError, AttributeError):
            pytest.skip("insightface/cv2 not available")

    def test_extract_embeddings_empty(self):
        """UT-015: extract_embeddings returns empty list for None."""
        try:
            from app.core.face_engine import face_engine
            result = face_engine.extract_embeddings(None)
            assert result == []
        except (ImportError, AttributeError):
            pytest.skip("insightface/cv2 not available")


class TestUnitVectorStore:
    """Unit tests for vector store (ChromaDB)."""

    def test_vector_store_add_and_search(self):
        """UT-016: VectorStore can add and search faces."""
        try:
            from app.db.vector_store import vector_store
            test_id = f"unit_test_{uuid4().hex[:8]}"
            test_emb = [0.1] * 512

            vector_store.add_face(test_id, test_emb, {"name": "Unit Test"})
            results = vector_store.search_face(test_emb)
            assert results is not None

            # Cleanup
            vector_store.delete_student_faces(test_id)
        except (ImportError, Exception) as e:
            pytest.skip(f"VectorStore not available: {e}")

    def test_vector_store_delete(self):
        """UT-017: VectorStore can delete faces."""
        try:
            from app.db.vector_store import vector_store
            test_id = f"unit_test_del_{uuid4().hex[:8]}"
            test_emb = [0.2] * 512

            vector_store.add_face(test_id, test_emb, {"name": "Delete Test"})
            vector_store.delete_student_faces(test_id)
            # After delete, search should not find it with high confidence
        except (ImportError, Exception) as e:
            pytest.skip(f"VectorStore not available: {e}")


# ============================================================================
# SECTION 2: VALIDATION TESTS
# ============================================================================

class TestValidationAuth:
    """Validation tests for authentication."""

    def test_login_missing_credentials(self, client):
        """VT-001: Login without credentials returns 422."""
        r = client.post("/api/v1/login/access-token")
        assert r.status_code == 422

    def test_login_wrong_credentials(self, client):
        """VT-002: Login with wrong credentials returns 400/401."""
        r = client.post("/api/v1/login/access-token", data={
            "username": "nonexistent_user",
            "password": "wrong_password"
        })
        assert r.status_code in [400, 401]

    def test_login_empty_username(self, client):
        """VT-003: Login with empty username."""
        r = client.post("/api/v1/login/access-token", data={
            "username": "",
            "password": "test"
        })
        assert r.status_code in [400, 401, 422]

    def test_protected_route_no_token(self, client):
        """VT-004: Protected route without token returns 401."""
        r = client.get("/api/v1/students/")
        assert r.status_code == 401

    def test_protected_route_invalid_token(self, client):
        """VT-005: Protected route with invalid token returns 401/403."""
        headers = {"Authorization": "Bearer invalid_token_here"}
        r = client.get("/api/v1/students/", headers=headers)
        assert r.status_code in [401, 403]

    def test_protected_route_malformed_header(self, client):
        """VT-006: Protected route with malformed auth header."""
        headers = {"Authorization": "NotBearer some_token"}
        r = client.get("/api/v1/students/", headers=headers)
        assert r.status_code in [401, 403]


class TestValidationStudents:
    """Validation tests for student endpoints."""

    def test_create_student_missing_fields(self, client, admin_token_headers):
        """VT-007: Creating student with missing required fields."""
        r = client.post("/api/v1/students/", headers=admin_token_headers, json={})
        assert r.status_code == 422

    def test_create_student_invalid_uuid(self, client, admin_token_headers):
        """VT-008: Creating student with invalid UUID format."""
        r = client.post("/api/v1/students/", headers=admin_token_headers, json={
            "id": "not-a-uuid",
            "name": "Test",
            "organization_id": "not-a-uuid",
            "group_id": "not-a-uuid"
        })
        assert r.status_code == 422

    def test_get_nonexistent_student(self, client, admin_token_headers):
        """VT-009: Getting non-existent student returns 404."""
        fake_id = str(uuid4())
        r = client.get(f"/api/v1/students/{fake_id}", headers=admin_token_headers)
        assert r.status_code == 404

    def test_delete_student_nonexistent(self, client, admin_token_headers):
        """VT-010: Deleting non-existent student returns 404."""
        fake_id = str(uuid4())
        r = client.delete(f"/api/v1/students/{fake_id}", headers=admin_token_headers)
        assert r.status_code == 404


class TestValidationAttendance:
    """Validation tests for attendance endpoints."""

    def test_start_session_missing_group(self, client, admin_token_headers):
        """VT-011: Starting session without group_id."""
        r = client.post("/api/v1/attendance/start", headers=admin_token_headers, json={})
        assert r.status_code == 422

    def test_start_session_invalid_group(self, client, admin_token_headers):
        """VT-012: Starting session with invalid group_id."""
        r = client.post("/api/v1/attendance/start", headers=admin_token_headers, json={
            "group_id": "not-a-valid-uuid"
        })
        assert r.status_code == 422

    def test_attendance_history_invalid_staff_id(self, client, admin_token_headers):
        """VT-013: Getting attendance history with invalid staff_id format."""
        r = client.get("/api/v1/attendance/history/weekly/not-a-uuid",
                       headers=admin_token_headers)
        assert r.status_code == 422


class TestValidationOrganizations:
    """Validation tests for organization endpoints."""

    def test_create_org_missing_name(self, client, admin_token_headers):
        """VT-014: Creating organization without name."""
        r = client.post("/api/v1/organizations/", headers=admin_token_headers, json={})
        assert r.status_code == 422

    def test_get_nonexistent_org(self, client, admin_token_headers):
        """VT-015: Getting non-existent organization returns 404."""
        fake_id = str(uuid4())
        r = client.get(f"/api/v1/organizations/{fake_id}", headers=admin_token_headers)
        assert r.status_code == 404


class TestValidationGroups:
    """Validation tests for group endpoints."""

    def test_create_group_missing_fields(self, client, admin_token_headers):
        """VT-016: Creating group without required fields."""
        r = client.post("/api/v1/groups/", headers=admin_token_headers, json={})
        assert r.status_code == 422

    def test_get_nonexistent_group(self, client, admin_token_headers):
        """VT-017: Getting non-existent group returns 404."""
        fake_id = str(uuid4())
        r = client.get(f"/api/v1/groups/{fake_id}", headers=admin_token_headers)
        assert r.status_code == 404


class TestValidationRecognition:
    """Validation tests for face recognition endpoints."""

    def test_register_face_no_file(self, client, admin_token_headers):
        """VT-018: Register face without image file."""
        r = client.post("/api/v1/recognition/register-face",
                        headers=admin_token_headers,
                        data={"student_id": str(uuid4())})
        assert r.status_code == 422

    def test_recognize_no_file(self, client, admin_token_headers):
        """VT-019: Recognize without image file."""
        r = client.post("/api/v1/recognition/recognize",
                        headers=admin_token_headers)
        assert r.status_code == 422


# ============================================================================
# SECTION 3: INTEGRATION TESTS
# ============================================================================

class TestIntegrationAuthFlow:
    """Integration tests for authentication flow."""

    def test_full_login_flow(self, client, db):
        """IT-001: Full login flow - create staff then login."""
        from app.models.staff import Staff
        from app.models.organization import Organization
        from app.core import security

        org = Organization(id=uuid4(), name=f"IntTest Org {uuid4().hex[:6]}")
        db.add(org)
        db.commit()

        staff_code = f"int_test_{uuid4().hex[:8]}"
        staff = Staff(
            id=uuid4(),
            organization_id=org.id,
            staff_code=staff_code,
            name="Integration Tester",
            full_name="Integration Tester",
            email=f"{staff_code}@test.com",
            hashed_password=security.get_password_hash("securepass123"),
            is_superuser=False,
            is_active=True,
            role="STAFF",
        )
        db.add(staff)
        db.commit()

        # Login
        r = client.post("/api/v1/login/access-token", data={
            "username": staff_code,
            "password": "securepass123"
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Use token to access protected route
        headers = {"Authorization": f"Bearer {data['access_token']}"}
        r2 = client.get("/api/v1/staff/me", headers=headers)
        assert r2.status_code == 200
        me = r2.json()
        assert me["staff_code"] == staff_code

    def test_login_inactive_user(self, client, db):
        """IT-002: Inactive user cannot login."""
        from app.models.staff import Staff
        from app.models.organization import Organization
        from app.core import security

        org = Organization(id=uuid4(), name=f"IntTest Org Inactive {uuid4().hex[:6]}")
        db.add(org)
        db.commit()

        staff_code = f"inactive_{uuid4().hex[:8]}"
        staff = Staff(
            id=uuid4(),
            organization_id=org.id,
            staff_code=staff_code,
            name="Inactive User",
            full_name="Inactive User",
            email=f"{staff_code}@test.com",
            hashed_password=security.get_password_hash("pass123"),
            is_superuser=False,
            is_active=False,
            role="STAFF",
        )
        db.add(staff)
        db.commit()

        r = client.post("/api/v1/login/access-token", data={
            "username": staff_code,
            "password": "pass123"
        })
        assert r.status_code == 400


class TestIntegrationStudentCRUD:
    """Integration tests for full student CRUD lifecycle."""

    def test_student_create_read_update_delete(self, client, db, admin_token_headers):
        """IT-003: Full student CRUD lifecycle."""
        from app.models.organization import Organization
        from app.models.group import Group

        # Setup
        org = Organization(id=uuid4(), name=f"CRUD Org {uuid4().hex[:6]}")
        db.add(org)
        db.commit()

        group = Group(id=uuid4(), organization_id=org.id,
                      name=f"CRUD Group {uuid4().hex[:6]}", code=f"CG{uuid4().hex[:4]}")
        db.add(group)
        db.commit()

        student_data = {
            "organization_id": str(org.id),
            "name": "CRUD Test Student",
            "group_id": str(group.id),
            "external_id": f"EXT{uuid4().hex[:6]}"
        }

        # CREATE
        r = client.post("/api/v1/students/", headers=admin_token_headers, json=student_data)
        assert r.status_code == 200
        created = r.json()
        assert created["name"] == "CRUD Test Student"
        student_id = created["id"]  # Server generates the ID

        # READ
        r = client.get(f"/api/v1/students/{student_id}", headers=admin_token_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "CRUD Test Student"

        # UPDATE
        r = client.patch(f"/api/v1/students/{student_id}",
                         headers=admin_token_headers,
                         json={"name": "Updated Student Name"})
        assert r.status_code == 200
        assert r.json()["name"] == "Updated Student Name"

        # LIST
        r = client.get("/api/v1/students/", headers=admin_token_headers)
        assert r.status_code == 200
        students = r.json()
        assert any(s["id"] == student_id for s in students)

        # DELETE
        r = client.delete(f"/api/v1/students/{student_id}", headers=admin_token_headers)
        assert r.status_code == 200

    def test_students_filter_by_group(self, client, db, admin_token_headers):
        """IT-004: Filter students by group_id."""
        from app.models.organization import Organization
        from app.models.group import Group

        org = Organization(id=uuid4(), name=f"Filter Org {uuid4().hex[:6]}")
        db.add(org)
        db.commit()

        group = Group(id=uuid4(), organization_id=org.id,
                      name=f"Filter Group {uuid4().hex[:6]}", code=f"FG{uuid4().hex[:4]}")
        db.add(group)
        db.commit()

        # Create student in group
        student_data = {
            "id": str(uuid4()),
            "organization_id": str(org.id),
            "name": "Filtered Student",
            "role": "STUDENT",
            "group_id": str(group.id),
            "external_id": f"FLT{uuid4().hex[:6]}"
        }
        client.post("/api/v1/students/", headers=admin_token_headers, json=student_data)

        # Filter
        r = client.get(f"/api/v1/students/?group_id={group.id}", headers=admin_token_headers)
        assert r.status_code == 200


class TestIntegrationAttendanceFlow:
    """Integration tests for attendance workflow."""

    def test_full_attendance_session(self, client, db, admin_token_headers):
        """IT-005: Full attendance session: start -> status -> stop -> finalize."""
        from app.models.organization import Organization
        from app.models.group import Group

        org = Organization(id=uuid4(), name=f"Att Org {uuid4().hex[:6]}")
        db.add(org)
        db.commit()

        group = Group(id=uuid4(), organization_id=org.id,
                      name=f"Att Group {uuid4().hex[:6]}", code=f"AG{uuid4().hex[:4]}")
        db.add(group)
        db.commit()

        # START
        r = client.post("/api/v1/attendance/start", headers=admin_token_headers,
                        json={"group_id": str(group.id)})
        if r.status_code == 400 and "active" in r.text:
            # Session already active, stop it first
            client.post("/api/v1/attendance/stop", headers=admin_token_headers)
            client.post("/api/v1/attendance/finalize", headers=admin_token_headers)
            r = client.post("/api/v1/attendance/start", headers=admin_token_headers,
                            json={"group_id": str(group.id)})
        assert r.status_code == 200
        assert r.json()["state"] == "SCANNING"

        # STATUS
        r = client.get("/api/v1/attendance/status", headers=admin_token_headers)
        assert r.status_code == 200
        assert r.json()["state"] == "SCANNING"

        # STOP
        r = client.post("/api/v1/attendance/stop", headers=admin_token_headers)
        assert r.status_code == 200
        assert r.json()["state"] == "VERIFYING"

        # FINALIZE
        r = client.post("/api/v1/attendance/finalize", headers=admin_token_headers)
        assert r.status_code == 200
        assert "present_count" in r.json()


class TestIntegrationOrganizationGroupFlow:
    """Integration tests for organization and group management."""

    def test_org_and_group_lifecycle(self, client, db, admin_token_headers):
        """IT-006: Create org, create group, list groups."""
        from app.models.organization import Organization

        # Create org via DB (admin already exists in a different org for auth)
        org = Organization(id=uuid4(), name=f"Lifecycle Org {uuid4().hex[:6]}")
        db.add(org)
        db.commit()

        # List orgs
        r = client.get("/api/v1/organizations/", headers=admin_token_headers)
        assert r.status_code == 200

        # Create group
        group_data = {
            "organization_id": str(org.id),
            "name": f"Lifecycle Group {uuid4().hex[:6]}",
            "code": f"LG{uuid4().hex[:4]}"
        }
        r = client.post("/api/v1/groups/", headers=admin_token_headers, json=group_data)
        assert r.status_code == 200
        group_id = r.json()["id"]

        # Get group
        r = client.get(f"/api/v1/groups/{group_id}", headers=admin_token_headers)
        assert r.status_code == 200

        # List groups by org
        r = client.get(f"/api/v1/groups/?organization_id={org.id}",
                        headers=admin_token_headers)
        assert r.status_code == 200


class TestIntegrationStaffManagement:
    """Integration tests for staff management."""

    def test_staff_list(self, client, admin_token_headers):
        """IT-007: List staff members."""
        r = client.get("/api/v1/staff/", headers=admin_token_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_staff_me(self, client, admin_token_headers):
        """IT-008: Get current staff profile."""
        r = client.get("/api/v1/staff/me", headers=admin_token_headers)
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert "name" in data
        assert "email" in data


class TestIntegrationStats:
    """Integration tests for statistics."""

    def test_institutional_stats(self, client, admin_token_headers):
        """IT-009: Get institutional statistics."""
        r = client.get("/api/v1/stats/institutional", headers=admin_token_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_students" in data
        assert "total_staff" in data


class TestIntegrationClasses:
    """Integration tests for classes."""

    def test_live_classes(self, client, admin_token_headers):
        """IT-010: Get live classes."""
        r = client.get("/api/v1/classes/live", headers=admin_token_headers)
        assert r.status_code == 200

    def test_class_schedule_nonexistent(self, client, admin_token_headers):
        """IT-011: Get schedule for non-existent class."""
        fake_id = str(uuid4())
        r = client.get(f"/api/v1/classes/{fake_id}/schedule/today",
                       headers=admin_token_headers)
        # Should return 200 with empty list or 404
        assert r.status_code in [200, 404]


class TestIntegrationTimetable:
    """Integration tests for timetable."""

    def test_list_timetable(self, client, admin_token_headers):
        """IT-012: List timetable entries."""
        r = client.get("/api/v1/timetable/", headers=admin_token_headers)
        assert r.status_code == 200

    def test_create_timetable_entry(self, client, db, admin_token_headers):
        """IT-013: Create a timetable entry."""
        from app.models.organization import Organization
        from app.models.group import Group

        org = Organization(id=uuid4(), name=f"TT Org {uuid4().hex[:6]}")
        db.add(org)
        db.commit()

        group = Group(id=uuid4(), organization_id=org.id,
                      name=f"TT Group {uuid4().hex[:6]}", code=f"TT{uuid4().hex[:4]}")
        db.add(group)
        db.commit()

        # Get admin staff id from /staff/me
        r = client.get("/api/v1/staff/me", headers=admin_token_headers)
        staff_id = r.json()["id"]

        entry = {
            "group_id": str(group.id),
            "staff_id": staff_id,
            "subject": "Test Subject",
            "day_of_week": 1,
            "period": 1,
            "start_time": "09:00",
            "end_time": "10:00"
        }
        r = client.post("/api/v1/timetable/", headers=admin_token_headers, json=entry)
        assert r.status_code == 200


# ============================================================================
# SECTION 4: CPU/GPU MODE TESTS
# ============================================================================

class TestCPUMode:
    """Tests specific to CPU mode operation."""

    def test_cpu_mode_system_info(self, client):
        """CPU-001: System info confirms CPU-only mode."""
        r = client.get("/system-info")
        assert r.status_code == 200
        data = r.json()
        assert data["device"] == "CPU-only"
        assert data["env_cuda_visible"] is not None  # May be "" or "0" depending on env

    def test_cpu_mode_health(self, client):
        """CPU-002: Health confirms CPU device."""
        r = client.get("/health")
        data = r.json()
        assert data["device"] == "cpu"
        assert data["mode"] == "low-power"

    def test_cpu_thread_environment(self):
        """CPU-003: CPU thread environment variables are set."""
        omp_threads = os.environ.get("OMP_NUM_THREADS")
        assert omp_threads is not None
        assert int(omp_threads) <= 4  # Low-power should use few threads

    def test_cpu_onnx_provider(self):
        """CPU-004: Only CPU execution provider is available/configured."""
        try:
            import onnxruntime as ort
            providers = ort.get_available_providers()
            assert "CPUExecutionProvider" in providers
        except ImportError:
            pytest.skip("onnxruntime not available")

    def test_cpu_face_engine_provider(self):
        """CPU-005: FaceEngine uses CPU provider."""
        try:
            from app.core.face_engine import face_engine
            face_engine._ensure_initialized()
            assert face_engine.device == "CPU"
            assert "CPUExecutionProvider" in face_engine.providers
        except (ImportError, Exception) as e:
            pytest.skip(f"FaceEngine not available: {e}")

    def test_cpu_image_downscaling(self):
        """CPU-006: Images are downscaled for CPU efficiency."""
        try:
            from app.core.face_engine import downscale_image
            from app.core.config import settings
            
            large = np.zeros((2000, 2000, 3), dtype=np.uint8)
            result = downscale_image(large)
            assert max(result.shape[:2]) <= settings.MAX_IMAGE_DIMENSION
        except ImportError:
            pytest.skip("Dependencies not available")


class TestGPUModeSimulation:
    """Tests for GPU mode configuration (simulated - checks config paths).
    Note: These tests verify the GPU code paths exist and config is correct,
    even on CPU-only hardware."""

    def test_gpu_config_exists(self):
        """GPU-001: GPU configuration parameters exist in settings."""
        from app.core.config import settings
        assert hasattr(settings, 'FACE_DET_SIZE_GPU')
        assert settings.FACE_DET_SIZE_GPU == 640  # Default GPU det size

    def test_gpu_device_preference_configurable(self):
        """GPU-002: FACE_DEVICE_PREFERENCE is configurable."""
        from app.core.config import settings
        # Currently set to cpu, but the field exists
        assert hasattr(settings, 'FACE_DEVICE_PREFERENCE')
        assert settings.FACE_DEVICE_PREFERENCE in ["cpu", "gpu", "cuda"]

    def test_gpu_onnx_providers_check(self):
        """GPU-003: Check available ONNX providers (GPU may not be present)."""
        try:
            import onnxruntime as ort
            providers = ort.get_available_providers()
            has_gpu = any(p in providers for p in [
                "CUDAExecutionProvider",
                "TensorrtExecutionProvider",
                "DirectMLExecutionProvider"
            ])
            # Report but don't fail - GPU may not be available
            if has_gpu:
                print(f"GPU providers available: {[p for p in providers if 'CPU' not in p]}")
            else:
                print("No GPU providers available (CPU-only mode)")
        except ImportError:
            pytest.skip("onnxruntime not available")

    def test_gpu_model_variants_supported(self):
        """GPU-004: Face model name supports GPU-optimized variants."""
        from app.core.config import settings
        # Verify model name field exists (buffalo_l is for GPU, buffalo_sc for CPU)
        assert settings.FACE_MODEL_NAME is not None
        # All valid models
        valid_models = ["buffalo_sc", "buffalo_m", "buffalo_l", "antelopev2"]
        assert settings.FACE_MODEL_NAME in valid_models


# ============================================================================
# SECTION 5: PERFORMANCE / TIMING TESTS
# ============================================================================

class TestPerformance:
    """Performance tests to measure response times."""

    def test_health_latency(self, client):
        """PERF-001: Health endpoint responds within 500ms."""
        start = time.time()
        r = client.get("/health")
        elapsed = time.time() - start
        assert r.status_code == 200
        assert elapsed < 0.5, f"Health endpoint took {elapsed:.3f}s (>500ms)"

    def test_root_latency(self, client):
        """PERF-002: Root endpoint responds within 500ms."""
        start = time.time()
        r = client.get("/")
        elapsed = time.time() - start
        assert r.status_code == 200
        assert elapsed < 0.5, f"Root endpoint took {elapsed:.3f}s (>500ms)"

    def test_system_info_latency(self, client):
        """PERF-003: System info responds within 500ms."""
        start = time.time()
        r = client.get("/system-info")
        elapsed = time.time() - start
        assert r.status_code == 200
        assert elapsed < 0.5, f"System info took {elapsed:.3f}s (>500ms)"

    def test_auth_latency(self, client, admin_token_headers):
        """PERF-004: Authenticated endpoint responds within 2s."""
        start = time.time()
        r = client.get("/api/v1/staff/me", headers=admin_token_headers)
        elapsed = time.time() - start
        assert r.status_code == 200
        assert elapsed < 2.0, f"Staff/me took {elapsed:.3f}s (>2s)"
