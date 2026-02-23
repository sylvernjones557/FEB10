"""Full-stack integration test for all backend endpoints after audit fixes."""
import requests
import sys

BASE = "http://127.0.0.1:8000/api/v1"
PASS = 0
FAIL = 0
ERRORS = []

def test(name, method, path, expected_status, **kwargs):
    global PASS, FAIL
    url = f"{BASE}{path}"
    try:
        r = getattr(requests, method)(url, timeout=10, **kwargs)
        if r.status_code == expected_status:
            PASS += 1
            print(f"  PASS  {name} -> {r.status_code}")
            return r
        else:
            FAIL += 1
            detail = ""
            try:
                detail = r.json().get("detail", "")
            except:
                pass
            ERRORS.append(f"{name}: expected {expected_status}, got {r.status_code} {detail}")
            print(f"  FAIL  {name} -> {r.status_code} {detail}")
            return r
    except Exception as e:
        FAIL += 1
        ERRORS.append(f"{name}: {e}")
        print(f"  FAIL  {name} -> {e}")
        return None

# 1. Health
print("\n=== HEALTH ===")
test("Root health", "get", "/../", 200)

# 2. Auth
print("\n=== AUTH ===")
r = test("Login (admin)", "post", "/login/access-token",
         200, data={"username": "admin", "password": "admin123"})
token = r.json()["access_token"] if r and r.status_code == 200 else None
if not token:
    print("FATAL: Cannot get token. Aborting.")
    sys.exit(1)
headers = {"Authorization": f"Bearer {token}"}

# 3. Staff /me
print("\n=== STAFF ===")
r = test("GET /staff/me", "get", "/staff/me", 200, headers=headers)
me = r.json() if r and r.status_code == 200 else {}
staff_id = me.get("id", "")
org_id = me.get("organization_id", "")
print(f"       Logged in as: {me.get('name')} ({me.get('staff_code')}) org={org_id}")

# Check essential fields exist
for field in ["id", "name", "staff_code", "role", "organization_id", "type", "is_active"]:
    if field in me:
        PASS += 1
        print(f"  PASS  /me has field '{field}'")
    else:
        FAIL += 1
        ERRORS.append(f"/me missing field '{field}'")
        print(f"  FAIL  /me missing field '{field}'")

# 4. Staff CRUD
r = test("GET /staff/", "get", "/staff/", 200, headers=headers)
staff_list = r.json() if r and r.status_code == 200 else []
print(f"       Found {len(staff_list)} staff members")

# Create a test staff
r = test("POST /staff/ (create)", "post", "/staff/", 200, headers=headers,
         json={"name": "Test Audit User", "staff_code": "AUDIT001", "password": "testpass123",
                "email": "audit@test.com", "type": "SUBJECT_TEACHER"})
new_staff_id = None
if r and r.status_code == 200:
    new_staff_id = r.json().get("id")
    print(f"       Created staff: {new_staff_id}")

if new_staff_id:
    test("GET /staff/{id}", "get", f"/staff/{new_staff_id}", 200, headers=headers)
    test("PATCH /staff/{id}", "patch", f"/staff/{new_staff_id}", 200, headers=headers,
         json={"primary_subject": "Mathematics"})
    test("DELETE /staff/{id}", "delete", f"/staff/{new_staff_id}", 200, headers=headers)

# 5. Organizations
print("\n=== ORGANIZATIONS ===")
test("GET /organizations/", "get", "/organizations/", 200, headers=headers)
if org_id:
    test("GET /organizations/{id} (UUID)", "get", f"/organizations/{org_id}", 200, headers=headers)

# 6. Groups
print("\n=== GROUPS ===")
r = test("GET /groups/", "get", "/groups/", 200, headers=headers)
groups = r.json() if r and r.status_code == 200 else []
print(f"       Found {len(groups)} groups")

r = test("POST /groups/ (create)", "post", "/groups/", 200, headers=headers,
         json={"organization_id": org_id, "name": "Audit Test Group", "code": "ATG"})
new_group_id = None
if r and r.status_code == 200:
    new_group_id = r.json().get("id")

if new_group_id:
    test("GET /groups/{id}", "get", f"/groups/{new_group_id}", 200, headers=headers)
    test("PATCH /groups/{id}", "patch", f"/groups/{new_group_id}", 200, headers=headers,
         json={"name": "Audit Test Group Updated"})
    test("GET /groups/{id}/students", "get", f"/groups/{new_group_id}/students", 200, headers=headers)
    test("GET /groups/{id}/timetable", "get", f"/groups/{new_group_id}/timetable", 200, headers=headers)
    test("DELETE /groups/{id}", "delete", f"/groups/{new_group_id}", 200, headers=headers)

# 7. Students 
print("\n=== STUDENTS ===")
r = test("GET /students/", "get", "/students/", 200, headers=headers)
students = r.json() if r and r.status_code == 200 else []
print(f"       Found {len(students)} students")

# Need a group for student creation
test_group_id = groups[0]["id"] if groups else None
if test_group_id:
    r = test("POST /students/ (create)", "post", "/students/", 200, headers=headers,
             json={"name": "Audit Student", "group_id": test_group_id, "roll_no": "AUDIT-001"})
    new_student_id = None
    if r and r.status_code == 200:
        new_student_id = r.json().get("id")

    if new_student_id:
        test("GET /students/{id}", "get", f"/students/{new_student_id}", 200, headers=headers)
        test("PATCH /students/{id}", "patch", f"/students/{new_student_id}", 200, headers=headers,
             json={"name": "Audit Student Updated"})
        test("DELETE /students/{id}", "delete", f"/students/{new_student_id}", 200, headers=headers)

# 8. Timetable
print("\n=== TIMETABLE ===")
r = test("GET /timetable/", "get", "/timetable/", 200, headers=headers)
timetables = r.json() if r and r.status_code == 200 else []
print(f"       Found {len(timetables)} timetable entries")

if test_group_id:
    r = test("POST /timetable/ (create)", "post", "/timetable/", 200, headers=headers,
             json={"group_id": test_group_id, "staff_id": staff_id, "day_of_week": 1,
                    "period": 99, "subject": "Audit Subject"})
    new_tt_id = None
    if r and r.status_code == 200:
        new_tt_id = r.json().get("id")
    if new_tt_id:
        test("GET /timetable/{id}", "get", f"/timetable/{new_tt_id}", 200, headers=headers)
        test("PATCH /timetable/{id}", "patch", f"/timetable/{new_tt_id}", 200, headers=headers,
             json={"subject": "Audit Subject Updated"})
        test("DELETE /timetable/{id}", "delete", f"/timetable/{new_tt_id}", 200, headers=headers)

# 9. Attendance flow
print("\n=== ATTENDANCE ===")
if test_group_id:
    test("POST /attendance/start", "post", "/attendance/start", 200, headers=headers,
         json={"group_id": test_group_id})
    test("GET /attendance/status", "get", "/attendance/status", 200, headers=headers)
    test("POST /attendance/stop", "post", "/attendance/stop", 200, headers=headers)
    test("POST /attendance/verify", "post", "/attendance/verify", 200, headers=headers,
         json={"manual_present": [], "manual_absent": []})
    test("POST /attendance/finalize", "post", "/attendance/finalize", 200, headers=headers)
    test("GET /attendance/history/weekly/{id}", "get", f"/attendance/history/weekly/{staff_id}",
         200, headers=headers)

# 10. Stats
print("\n=== STATS ===")
r = test("GET /stats/institutional", "get", "/stats/institutional", 200, headers=headers)
if r and r.status_code == 200:
    stats = r.json()
    for field in ["total_students", "total_staff", "total_classes", "today_attendance_rate"]:
        if field in stats:
            PASS += 1
            print(f"  PASS  stats has '{field}' = {stats[field]}")
        else:
            FAIL += 1
            ERRORS.append(f"stats missing '{field}'")
            print(f"  FAIL  stats missing '{field}'")

# 11. Classes
print("\n=== CLASSES ===")
test("GET /classes/live", "get", "/classes/live", 200, headers=headers)
if test_group_id:
    test("GET /classes/{id}/schedule/today", "get", f"/classes/{test_group_id}/schedule/today",
         200, headers=headers)

# 12. FK safety checks
print("\n=== FK SAFETY (delete with deps) ===")
# Create a group, add a student, then try to delete the group (should fail with 400)
r = test("POST /groups/ (for FK test)", "post", "/groups/", 200, headers=headers,
         json={"organization_id": org_id, "name": "FK Delete Test", "code": "FKT"})
fk_group_id = r.json().get("id") if r and r.status_code == 200 else None
if fk_group_id:
    r = test("POST /students/ (in FK group)", "post", "/students/", 200, headers=headers,
             json={"name": "FK Student", "group_id": fk_group_id, "roll_no": "FK-001"})
    fk_student_id = r.json().get("id") if r and r.status_code == 200 else None

    test("DELETE /groups/{id} (has students -> 400)", "delete", f"/groups/{fk_group_id}",
         400, headers=headers)

    # Clean up: delete student first, then group
    if fk_student_id:
        test("DELETE student (cleanup)", "delete", f"/students/{fk_student_id}", 200, headers=headers)
    test("DELETE group (cleanup, now empty)", "delete", f"/groups/{fk_group_id}", 200, headers=headers)


# Summary
print(f"\n{'='*60}")
print(f"  RESULTS: {PASS} PASS / {FAIL} FAIL / {PASS+FAIL} TOTAL")
print(f"{'='*60}")
if ERRORS:
    print("\n  FAILURES:")
    for e in ERRORS:
        print(f"    - {e}")
print()
