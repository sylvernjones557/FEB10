"""Test ALL endpoints including new attendance/recognition/stats/classes routes."""
import requests
import json
import sys

BASE = "http://localhost:8000"
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
        try:
            return r.json() if r.status_code < 500 else None
        except:
            return None
    except Exception as e:
        FAIL += 1
        RESULTS.append(f"  FAIL  {name} (exception: {e})")
        return None

print("=" * 60)
print("INTEGRATION HEALTH CHECK")
print("=" * 60)

# ── 1. Root ──
print("\n[1] Root & Docs")
test("GET /", "get", BASE, 200)
try:
    r = requests.get(f"{API}/docs", timeout=10)
    if r.status_code == 200:
        PASS += 1
        RESULTS.append("  PASS  GET /api/v1/docs (Swagger)")
    else:
        FAIL += 1
        RESULTS.append(f"  FAIL  GET /api/v1/docs (status {r.status_code})")
except Exception as e:
    FAIL += 1
    RESULTS.append(f"  FAIL  GET /api/v1/docs ({e})")

# ── 2. Auth ──
print("\n[2] Authentication")
test("POST login (wrong password)", "post", f"{API}/login/access-token", 400,
     data={"username": "admin", "password": "wrong"})
token_resp = test("POST login (correct)", "post", f"{API}/login/access-token", 200,
                  data={"username": "admin", "password": "password"})
TOKEN = token_resp["access_token"] if token_resp else None
AUTH = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
AUTH_JSON = {**AUTH, "Content-Type": "application/json"}

test("GET /staff/me (valid)", "get", f"{API}/staff/me", 200, headers=AUTH)

# Verify staff/me returns new fields
me = test("GET /staff/me fields check", "get", f"{API}/staff/me", 200, headers=AUTH)
if me:
    for field in ["id", "name", "email", "staff_code", "role", "organization_id", "type", "full_name"]:
        if field in me:
            PASS += 1
            RESULTS.append(f"  PASS  /staff/me has field '{field}' = {repr(me[field])[:50]}")
        else:
            FAIL += 1
            RESULTS.append(f"  FAIL  /staff/me missing field '{field}'")

# ── 3. Organizations ──
print("\n[3] Organizations")
test("GET /organizations/", "get", f"{API}/organizations/", 200, headers=AUTH)

# ── 4. Groups ──
print("\n[4] Groups")
test("GET /groups/", "get", f"{API}/groups/", 200, headers=AUTH)

# ── 5. Staff CRUD with new fields ──
print("\n[5] Staff CRUD with new fields")
test("GET /staff/", "get", f"{API}/staff/", 200, headers=AUTH)

new_staff = test("POST /staff/ (with new fields)", "post", f"{API}/staff/", 200,
    headers=AUTH_JSON,
    json_body={
        "name": "Integration Test Teacher",
        "full_name": "Integration Test Teacher",
        "staff_code": "INT001",
        "password": "test123",
        "email": "inttest@school.edu",
        "role": "STAFF",
        "type": "CLASS_TEACHER",
        "primary_subject": "Mathematics",
        "assigned_class_id": "22222222-2222-2222-2222-222222222221",
        "avatar_url": "https://example.com/avatar.png"
    })
new_staff_id = new_staff["id"] if new_staff else None

if new_staff:
    for field in ["type", "primary_subject", "assigned_class_id", "avatar_url", "full_name"]:
        if field in new_staff and new_staff[field]:
            PASS += 1
            RESULTS.append(f"  PASS  Created staff has '{field}' = {repr(new_staff[field])[:50]}")
        else:
            FAIL += 1
            RESULTS.append(f"  FAIL  Created staff missing/empty '{field}'")

if new_staff_id:
    test("DELETE /staff/<id> (cleanup)", "delete", f"{API}/staff/{new_staff_id}", 200, headers=AUTH)

# ── 6. Students CRUD with new fields ──
print("\n[6] Students CRUD with new fields")
new_student = test("POST /students/ (with new fields)", "post", f"{API}/students/", 200,
    headers=AUTH_JSON,
    json_body={
        "name": "Integration Test Student",
        "group_id": "22222222-2222-2222-2222-222222222222",
        "roll_no": "INT01",
        "external_id": "EXT-INT01",
        "avatar_url": "https://example.com/student.png"
    })
new_student_id = new_student["id"] if new_student else None

if new_student:
    for field in ["external_id", "face_data_registered", "avatar_url"]:
        if field in new_student:
            PASS += 1
            RESULTS.append(f"  PASS  Created student has '{field}' = {repr(new_student[field])[:50]}")
        else:
            FAIL += 1
            RESULTS.append(f"  FAIL  Created student missing '{field}'")

if new_student_id:
    test("DELETE /students/<id> (cleanup)", "delete", f"{API}/students/{new_student_id}", 200, headers=AUTH)

# ── 7. Timetable ──
print("\n[7] Timetable")
test("GET /timetable/", "get", f"{API}/timetable/", 200, headers=AUTH)

# ── 8. Stats (NEW) ──
print("\n[8] Stats (NEW)")
stats = test("GET /stats/institutional", "get", f"{API}/stats/institutional", 200, headers=AUTH)
if stats:
    for field in ["total_students", "total_staff", "total_classes", "today_attendance_rate"]:
        if field in stats:
            PASS += 1
            RESULTS.append(f"  PASS  Stats has '{field}' = {stats[field]}")
        else:
            FAIL += 1
            RESULTS.append(f"  FAIL  Stats missing '{field}'")

# ── 9. Classes (NEW) ──
print("\n[9] Classes / Schedule (NEW)")
test("GET /classes/live", "get", f"{API}/classes/live", 200, headers=AUTH)
test("GET /classes/<id>/schedule/today", "get",
     f"{API}/classes/22222222-2222-2222-2222-222222222221/schedule/today", 200, headers=AUTH)
test("GET /classes/<bad id>/schedule/today", "get",
     f"{API}/classes/00000000-0000-0000-0000-000000000000/schedule/today", 404, headers=AUTH)

# ── 10. Attendance (NEW) ──
print("\n[10] Attendance (NEW)")
test("GET /attendance/status (idle)", "get", f"{API}/attendance/status", 200, headers=AUTH)

# Start a session
start_resp = test("POST /attendance/start", "post", f"{API}/attendance/start", 200,
    headers=AUTH_JSON,
    json_body={"group_id": "22222222-2222-2222-2222-222222222221"})

test("GET /attendance/status (scanning)", "get", f"{API}/attendance/status", 200, headers=AUTH)

# Can't start another while one is active
test("POST /attendance/start (duplicate)", "post", f"{API}/attendance/start", 400,
    headers=AUTH_JSON,
    json_body={"group_id": "22222222-2222-2222-2222-222222222222"})

# Stop scanning
test("POST /attendance/stop", "post", f"{API}/attendance/stop", 200, headers=AUTH)

# Verify
test("POST /attendance/verify", "post", f"{API}/attendance/verify", 200,
    headers=AUTH_JSON,
    json_body={"manual_present": [], "manual_absent": []})

# Finalize
test("POST /attendance/finalize", "post", f"{API}/attendance/finalize", 200,
    headers=AUTH_JSON)

# After finalize, should be idle
test("GET /attendance/status (idle again)", "get", f"{API}/attendance/status", 200, headers=AUTH)

# Weekly history
test("GET /attendance/history/weekly/<id>", "get",
     f"{API}/attendance/history/weekly/d65da212-5b6c-4910-b7b7-073925e5ce5c", 200, headers=AUTH)

# ── 11. Recognition endpoints exist (will return 503 if InsightFace not installed) ──
print("\n[11] Recognition endpoints (existence check)")
# We just verify the endpoints exist (return 422 for missing form data, not 404)
try:
    r = requests.post(f"{API}/recognition/register-face", headers=AUTH, timeout=10)
    if r.status_code != 404:
        PASS += 1
        RESULTS.append(f"  PASS  POST /recognition/register-face exists (status {r.status_code})")
    else:
        FAIL += 1
        RESULTS.append("  FAIL  POST /recognition/register-face returns 404")
except Exception as e:
    FAIL += 1
    RESULTS.append(f"  FAIL  POST /recognition/register-face ({e})")

try:
    r = requests.post(f"{API}/recognition/recognize", headers=AUTH, timeout=10)
    if r.status_code != 404:
        PASS += 1
        RESULTS.append(f"  PASS  POST /recognition/recognize exists (status {r.status_code})")
    else:
        FAIL += 1
        RESULTS.append("  FAIL  POST /recognition/recognize returns 404")
except Exception as e:
    FAIL += 1
    RESULTS.append(f"  FAIL  POST /recognition/recognize ({e})")

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
