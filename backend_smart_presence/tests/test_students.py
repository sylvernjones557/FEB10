
def test_create_member_and_list(client, admin_token_headers):
    # 1. Create Member
    member_data = {
        "id": "m-test-1",
        "organization_id": "org-1",
        "name": "Test Member 1",
        "role": "MEMBER",
        "group_id": "g1",
        "external_id": "M001"
    }
    r = client.post(
        "/api/v1/members/",
        headers=admin_token_headers,
        json=member_data
    )
    assert r.status_code == 200
    created_member = r.json()
    assert created_member["id"] == "m-test-1"
    
    # 2. Get List
    r = client.get("/api/v1/members/", headers=admin_token_headers)
    assert r.status_code == 200
    members = r.json()
    assert len(members) >= 1
    assert any(m["id"] == "m-test-1" for m in members)
