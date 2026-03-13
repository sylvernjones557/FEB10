
import pytest

def test_attendance_flow(client, db, admin_token_headers):
    from uuid import uuid4
    from app.models.organization import Organization
    from app.models.group import Group

    # 0. Setup dependencies
    org = Organization(id=uuid4(), name="Test Org 3")
    db.add(org)
    db.commit()
    
    group = Group(id=uuid4(), organization_id=org.id, name="Test Group", code="TG2")
    db.add(group)
    db.commit()

    # 1. Start Session
    payload = {"group_id": str(group.id)}
    r = client.post("/api/v1/attendance/start", headers=admin_token_headers, json=payload)
    if r.status_code == 400 and "active" in r.text:
        pass
    else:
        assert r.status_code == 200
        assert r.json()["state"] == "SCANNING"

    # 2. Get Status
    r = client.get("/api/v1/attendance/status", headers=admin_token_headers)
    assert r.status_code == 200
    assert r.json()["state"] == "SCANNING"

    # 3. Stop
    r = client.post("/api/v1/attendance/stop", headers=admin_token_headers)
    assert r.status_code == 200
    assert r.json()["state"] == "VERIFYING"

    # 4. Finalize
    r = client.post("/api/v1/attendance/finalize", headers=admin_token_headers)
    assert r.status_code == 200
    assert r.json()["present_count"] == 0 # No faces recognized
