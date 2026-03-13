
def test_create_member_and_list(client, db, admin_token_headers):
    from uuid import uuid4
    from app.models.organization import Organization
    from app.models.group import Group

    # 0. Setup dependencies
    org = Organization(id=uuid4(), name="Test Org 2")
    db.add(org)
    db.commit()
    
    group = Group(id=uuid4(), organization_id=org.id, name="Test Group", code="TG1")
    db.add(group)
    db.commit()

    # 1. Create Student
    student_data = {
        "id": str(uuid4()),
        "organization_id": str(org.id),
        "name": "Test Student 1",
        "role": "STUDENT",
        "group_id": str(group.id),
        "external_id": "M001"
    }
    r = client.post(
        "/api/v1/students/",
        headers=admin_token_headers,
        json=student_data
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Test Student 1"

    # 2. List Students
    r = client.get("/api/v1/students/", headers=admin_token_headers)
    assert r.status_code == 200
    students = r.json()
    assert len(students) >= 1
