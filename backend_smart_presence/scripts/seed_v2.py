"""Seed V2 data into Supabase via REST API (organization, groups, staff, timetable)."""
import requests, json

SUPABASE_URL = "https://gnvarelitiufeevowaru.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudmFyZWxpdGl1ZmVldm93YXJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUxOTYxNSwiZXhwIjoyMDg2MDk1NjE1fQ.FRPKXKfc32fBCr_N3GjtWY6Qoc1I-7ch7E8J8ejvyd8"

HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def post(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.post(url, headers=HEADERS, json=data)
    if r.status_code in (200, 201):
        print(f"  [{table}] Inserted {len(data)} row(s)")
        return r.json()
    else:
        print(f"  [{table}] ERROR {r.status_code}: {r.text}")
        return None

def get(table, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}&select=*"
    r = requests.get(url, headers=HEADERS)
    return r.json()

# ── Fixed UUIDs for easy linking ──
ORG_ID   = "11111111-1111-1111-1111-111111111111"
CLASS_IDS = {
    1: "22222222-2222-2222-2222-222222222221",
    2: "22222222-2222-2222-2222-222222222222",
    3: "22222222-2222-2222-2222-222222222223",
    4: "22222222-2222-2222-2222-222222222224",
    5: "22222222-2222-2222-2222-222222222225",
}
STAFF_IDS = {
    "STF001": "33333333-3333-3333-3333-333333333331",
    "STF002": "33333333-3333-3333-3333-333333333332",
    "STF003": "33333333-3333-3333-3333-333333333333",
}

# ── 1) Organization (school) ──
print("1) Seeding organization...")
post("organizations", [
    {"id": ORG_ID, "name": "Green Valley School"},
])

# ── 2) Groups (classes 1-5) ──
print("2) Seeding groups (classes 1-5)...")
post("groups", [
    {"id": CLASS_IDS[i], "organization_id": ORG_ID, "name": f"Class {i}", "code": f"C{i}"}
    for i in range(1, 6)
])

# ── 3) Staff ──
print("3) Seeding staff...")
post("staff", [
    {"id": STAFF_IDS["STF001"], "organization_id": ORG_ID, "name": "Asha Raman",    "email": "asha@school.edu",   "staff_code": "STF001", "role": "STAFF"},
    {"id": STAFF_IDS["STF002"], "organization_id": ORG_ID, "name": "Vikram Das",     "email": "vikram@school.edu", "staff_code": "STF002", "role": "STAFF"},
    {"id": STAFF_IDS["STF003"], "organization_id": ORG_ID, "name": "Priya Sharma",   "email": "priya@school.edu",  "staff_code": "STF003", "role": "ADMIN"},
])

# ── 4) Timetable (Mon-Fri for Class 1 & 2 as samples) ──
print("4) Seeding timetable...")
timetable_data = []
# Class 1 - Monday (day_of_week=1)
timetable_data.extend([
    {"group_id": CLASS_IDS[1], "day_of_week": 1, "period": 1, "subject": "Math",    "staff_id": STAFF_IDS["STF001"], "start_time": "09:00", "end_time": "09:45"},
    {"group_id": CLASS_IDS[1], "day_of_week": 1, "period": 2, "subject": "English",  "staff_id": STAFF_IDS["STF002"], "start_time": "10:00", "end_time": "10:45"},
    {"group_id": CLASS_IDS[1], "day_of_week": 1, "period": 3, "subject": "Science",  "staff_id": STAFF_IDS["STF003"], "start_time": "11:00", "end_time": "11:45"},
])
# Class 2 - Monday
timetable_data.extend([
    {"group_id": CLASS_IDS[2], "day_of_week": 1, "period": 1, "subject": "English",  "staff_id": STAFF_IDS["STF002"], "start_time": "09:00", "end_time": "09:45"},
    {"group_id": CLASS_IDS[2], "day_of_week": 1, "period": 2, "subject": "Math",     "staff_id": STAFF_IDS["STF001"], "start_time": "10:00", "end_time": "10:45"},
    {"group_id": CLASS_IDS[2], "day_of_week": 1, "period": 3, "subject": "Art",      "staff_id": STAFF_IDS["STF003"], "start_time": "11:00", "end_time": "11:45"},
])
# Class 1 - Tuesday (day_of_week=2)
timetable_data.extend([
    {"group_id": CLASS_IDS[1], "day_of_week": 2, "period": 1, "subject": "Science",  "staff_id": STAFF_IDS["STF003"], "start_time": "09:00", "end_time": "09:45"},
    {"group_id": CLASS_IDS[1], "day_of_week": 2, "period": 2, "subject": "Math",     "staff_id": STAFF_IDS["STF001"], "start_time": "10:00", "end_time": "10:45"},
    {"group_id": CLASS_IDS[1], "day_of_week": 2, "period": 3, "subject": "English",  "staff_id": STAFF_IDS["STF002"], "start_time": "11:00", "end_time": "11:45"},
])
# Class 3 - Monday
timetable_data.extend([
    {"group_id": CLASS_IDS[3], "day_of_week": 1, "period": 1, "subject": "Science",  "staff_id": STAFF_IDS["STF003"], "start_time": "09:00", "end_time": "09:45"},
    {"group_id": CLASS_IDS[3], "day_of_week": 1, "period": 2, "subject": "Math",     "staff_id": STAFF_IDS["STF001"], "start_time": "10:00", "end_time": "10:45"},
])
post("timetable", timetable_data)

# ── 5) Verify everything ──
print("\n=== VERIFICATION ===")
print(f"\nOrganizations: {json.dumps(get('organizations'), indent=2)}")
print(f"\nGroups: {json.dumps(get('groups', 'order=name'), indent=2)}")
print(f"\nStaff: {json.dumps(get('staff', 'order=name'), indent=2)}")
print(f"\nTimetable (Class 1, Monday): {json.dumps(get('timetable', f'group_id=eq.{CLASS_IDS[1]}&day_of_week=eq.1&order=period'), indent=2)}")
print(f"\nStudents (should be empty): {json.dumps(get('students'), indent=2)}")
print("\nDone! All tables seeded and linked.")
