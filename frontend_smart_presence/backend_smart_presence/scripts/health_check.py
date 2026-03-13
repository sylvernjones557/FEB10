"""Comprehensive backend health check — tests every endpoint, edge case, and FK linkage."""
import requests
import json
import sys

BASE = "http://127.0.0.1:8000"
API = f"{BASE}/api/v1"
PASS = 0
FAIL = 0
RESULTS = []

def test(name, method, url, expected_status, headers=None, json_body=None, data=None):
    global PASS, FAIL
    try:
        r = getattr(requests, method)(url, headers=headers, json=json_body, data=data, timeout=10)
        ok = r.status_code == expected_status
        detail = ""
        if not ok:
            detail = f" (got {r.status_code}: {r.text[:200]})"
        if ok:
            PASS += 1
            RESULTS.append(f"  PASS  {name}")
        else:
            FAIL += 1
            RESULTS.append(f"  FAIL  {name}{detail}")
        return r.json() if r.status_code < 400 else None
    except Exception as e:
        FAIL += 1
        RESULTS.append(f"  FAIL  {name} (exception: {e})")
        return None

print("=" * 60)
print("BACKEND HEALTH CHECK")
print("=" * 60)

# ── 1. Root ──
print("\n[1] Root & Docs")
test("GET /", "get", BASE, 200)
# Swagger returns HTML, not JSON — just check status code
try:
    r = requests.get(f"{API}/docs", timeout=10)
    if r.status_code == 200:
        PASS += 1
        RESULTS.append("  PASS  GET /api/v1/docs (Swagger)")
    else:
        FAIL += 1
        RESULTS.append(f"  FAIL  GET /api/v1/docs (Swagger) (status {r.status_code})")
except Exception as e:
    FAIL += 1
    RESULTS.append(f"  FAIL  GET /api/v1/docs (Swagger) (exception: {e})")

# ── 2. Auth ──
print("\n[2] Authentication")
test("POST login (wrong password)", "post", f"{API}/login/access-token", 400,
     data={"username": "admin", "password": "wrong"})
test("POST login (nonexistent user)", "post", f"{API}/login/access-token", 400,
     data={"username": "nobody", "password": "x"})
token_resp = test("POST login (correct)", "post", f"{API}/login/access-token", 200,
                  data={"username": "admin", "password": "password"})
TOKEN = token_resp["access_token"] if token_resp else None
AUTH = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
AUTH_JSON = {**AUTH, "Content-Type": "application/json"}

test("GET /staff/me (no token)", "get", f"{API}/staff/me", 401)
test("GET /staff/me (bad token)", "get", f"{API}/staff/me", 403,
     headers={"Authorization": "Bearer invalidtoken"})
test("GET /staff/me (valid)", "get", f"{API}/staff/me", 200, headers=AUTH)

# ── 3. Organizations ──
print("\n[3] Organizations CRUD")
test("GET /organizations/", "get", f"{API}/organizations/", 200, headers=AUTH)
test("GET /organizations/<id>", "get", f"{API}/organizations/11111111-1111-1111-1111-111111111111", 200, headers=AUTH)
test("GET /organizations/<bad id>", "get", f"{API}/organizations/00000000-0000-0000-0000-000000000000", 404, headers=AUTH)

# ── 4. Groups (Classes) ──
print("\n[4] Groups CRUD")
groups = test("GET /groups/", "get", f"{API}/groups/", 200, headers=AUTH)
test("GET /groups/<id>", "get", f"{API}/groups/22222222-2222-2222-2222-222222222221", 200, headers=AUTH)
test("GET /groups/<bad id>", "get", f"{API}/groups/00000000-0000-0000-0000-000000000000", 404, headers=AUTH)

new_group = test("POST /groups/ (create)", "post", f"{API}/groups/", 200,
                 headers=AUTH_JSON,
                 json_body={"organization_id": "11111111-1111-1111-1111-111111111111",
                            "name": "Test Class", "code": "TC1"})
new_group_id = new_group["id"] if new_group else None

if new_group_id:
    test("PATCH /groups/<id>", "patch", f"{API}/groups/{new_group_id}", 200,
         headers=AUTH_JSON, json_body={"name": "Updated Test Class"})
    test("GET /groups/<id>/students (empty)", "get", f"{API}/groups/{new_group_id}/students", 200, headers=AUTH)
    test("GET /groups/<id>/timetable (empty)", "get", f"{API}/groups/{new_group_id}/timetable", 200, headers=AUTH)
    test("DELETE /groups/<id>", "delete", f"{API}/groups/{new_group_id}", 200, headers=AUTH)

# ── 5. Staff ──
print("\n[5] Staff CRUD")
test("GET /staff/", "get", f"{API}/staff/", 200, headers=AUTH)

new_staff = test("POST /staff/ (create)", "post", f"{API}/staff/", 200,
                 headers=AUTH_JSON,
                 json_body={"organization_id": "11111111-1111-1111-1111-111111111111",
                            "name": "Test Teacher", "email": "test@school.edu",
                            "staff_code": "TST001", "password": "test123"})
new_staff_id = new_staff["id"] if new_staff else None

test("POST /staff/ (duplicate code)", "post", f"{API}/staff/", 400,
     headers=AUTH_JSON,
     json_body={"organization_id": "11111111-1111-1111-1111-111111111111",
                "name": "Dup", "staff_code": "TST001", "password": "x"})

if new_staff_id:
    test("GET /staff/<id>", "get", f"{API}/staff/{new_staff_id}", 200, headers=AUTH)
    test("PATCH /staff/<id>", "patch", f"{API}/staff/{new_staff_id}", 200,
         headers=AUTH_JSON, json_body={"name": "Updated Teacher"})
    test("DELETE /staff/<id>", "delete", f"{API}/staff/{new_staff_id}", 200, headers=AUTH)

test("GET /staff/<bad id>", "get", f"{API}/staff/00000000-0000-0000-0000-000000000000", 404, headers=AUTH)

# ── 6. Students ──
print("\n[6] Students CRUD")
test("GET /students/", "get", f"{API}/students/", 200, headers=AUTH)
test("GET /students/?group_id=<id>", "get",
     f"{API}/students/?group_id=22222222-2222-2222-2222-222222222221", 200, headers=AUTH)

new_student = test("POST /students/ (create)", "post", f"{API}/students/", 200,
                   headers=AUTH_JSON,
                   json_body={"organization_id": "11111111-1111-1111-1111-111111111111",
                              "group_id": "22222222-2222-2222-2222-222222222222",
                              "name": "Test Student", "roll_no": "TS01"})
new_student_id = new_student["id"] if new_student else None

test("POST /students/ (bad group)", "post", f"{API}/students/", 404,
     headers=AUTH_JSON,
     json_body={"organization_id": "11111111-1111-1111-1111-111111111111",
                "group_id": "00000000-0000-0000-0000-000000000000",
                "name": "Bad"})

if new_student_id:
    test("GET /students/<id>", "get", f"{API}/students/{new_student_id}", 200, headers=AUTH)
    test("PATCH /students/<id>", "patch", f"{API}/students/{new_student_id}", 200,
         headers=AUTH_JSON, json_body={"name": "Updated Student"})
    test("DELETE /students/<id>", "delete", f"{API}/students/{new_student_id}", 200, headers=AUTH)

# ── 7. Timetable ──
print("\n[7] Timetable CRUD")
test("GET /timetable/", "get", f"{API}/timetable/", 200, headers=AUTH)
test("GET /timetable/?group_id=<id>", "get",
     f"{API}/timetable/?group_id=22222222-2222-2222-2222-222222222221", 200, headers=AUTH)
test("GET /timetable/?day_of_week=1", "get", f"{API}/timetable/?day_of_week=1", 200, headers=AUTH)

new_tt = test("POST /timetable/ (create)", "post", f"{API}/timetable/", 200,
              headers=AUTH_JSON,
              json_body={"group_id": "22222222-2222-2222-2222-222222222223",
                         "day_of_week": 3, "period": 1, "subject": "History",
                         "staff_id": "33333333-3333-3333-3333-333333333331",
                         "start_time": "09:00", "end_time": "09:45"})
new_tt_id = new_tt["id"] if new_tt else None

test("POST /timetable/ (bad group)", "post", f"{API}/timetable/", 404,
     headers=AUTH_JSON,
     json_body={"group_id": "00000000-0000-0000-0000-000000000000",
                "day_of_week": 1, "period": 1, "subject": "X"})

if new_tt_id:
    test("GET /timetable/<id>", "get", f"{API}/timetable/{new_tt_id}", 200, headers=AUTH)
    test("PATCH /timetable/<id>", "patch", f"{API}/timetable/{new_tt_id}", 200,
         headers=AUTH_JSON, json_body={"subject": "World History"})
    test("DELETE /timetable/<id>", "delete", f"{API}/timetable/{new_tt_id}", 200, headers=AUTH)

# ── 8. Cross-table queries ──
print("\n[8] Cross-table / FK linkage")
test("GET /groups/<id>/students", "get",
     f"{API}/groups/22222222-2222-2222-2222-222222222221/students", 200, headers=AUTH)
test("GET /groups/<id>/timetable?day=1", "get",
     f"{API}/groups/22222222-2222-2222-2222-222222222221/timetable?day_of_week=1", 200, headers=AUTH)
test("GET /timetable/?staff_id=<id>", "get",
     f"{API}/timetable/?staff_id=33333333-3333-3333-3333-333333333331", 200, headers=AUTH)

# ── Summary ──
print("\n" + "=" * 60)
print("RESULTS")
print("=" * 60)
for r in RESULTS:
    print(r)
print(f"\nTotal: {PASS + FAIL}  |  Pass: {PASS}  |  Fail: {FAIL}")
print("=" * 60)

if FAIL > 0:
    sys.exit(1)
