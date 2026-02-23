import requests
import json
import base64
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"
ADMIN_USER = "admin"
ADMIN_PASS = "admin"

def print_header(title):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def login():
    print_header("1. Authentication (Login)")
    try:
        payload = {"username": ADMIN_USER, "password": ADMIN_PASS}
        response = requests.post(f"{BASE_URL}/login/access-token", data=payload)
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"✅ Login Successful! Token: {token_data['access_token'][:15]}...")
            return token_data['access_token']
        else:
            print(f"❌ Login Failed: {response.text}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        sys.exit(1)

def test_user_profile(token):
    print_header("2. User Profile (/users/me)")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if response.status_code == 200:
        user = response.json()
        print(f"✅ User Configured: {user['email']} (Role: {user['role']})")
    else:
        print(f"❌ Failed to fetch profile: {response.text}")

def test_dashboard_stats(token):
    print_header("3. Dashboard Stats (/stats/institutional)")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/stats/institutional", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Stats Retrieved:")
        print(f"   - Presence Index: {stats['presence_index']}%")
        print(f"   - Total Enrollment: {stats['total_enrollment']}")
        print(f"   - Daily Success: {stats['daily_success']}%")
    else:
        print(f"❌ Failed to fetch stats: {response.text}")

def test_group_management(token):
    print_header("4. Group Management")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create a Group
    new_group = {
        "id": "g-test-1",
        "organization_id": "org-1",
        "name": "Test Group",
        "code": "TG1"
    }
    print(f"➡️ Creating Group: {new_group['id']}...")
    response = requests.post(f"{BASE_URL}/groups/", json=new_group, headers=headers)
    if response.status_code in [200, 400]: # 400 if already exists is fine
        print("✅ Group Created/Exists")
    else:
        print(f"❌ Group Creation Failed: {response.text}")

    # 2. Get Live Groups
    response = requests.get(f"{BASE_URL}/groups/", headers=headers)
    if response.status_code == 200:
        live = response.json()
        print(f"✅ Groups Endpoint Active (Count: {len(live)})")
    else:
        print(f"❌ Groups Failed: {response.text}")

def test_attendance_flow(token):
    print_header("5. Attendance Flow")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Start Session
    payload = {"group_id": "g-test-1"}
    print("➡️ Starting Attendance Session...")
    response = requests.post(f"{BASE_URL}/attendance/start", json=payload, headers=headers)
    
    # Need to handle 'already active' case
    if response.status_code == 400 and "active" in response.text:
         print("⚠️ Session already active, continuing...")
    elif response.status_code == 200:
         print("✅ Session Started")
    else:
         print(f"❌ Start Session Failed: {response.text}")

    # 2. Get Status
    response = requests.get(f"{BASE_URL}/attendance/status", headers=headers)
    if response.status_code == 200:
        status = response.json()
        print(f"✅ Current Status: {status['state']} (Present: {status['present_count']})")
    
    # 3. Stop Scanning
    requests.post(f"{BASE_URL}/attendance/stop", headers=headers)
    print("✅ Scanning Stopped")

    # 4. Finalize
    response = requests.post(f"{BASE_URL}/attendance/finalize", headers=headers)
    if response.status_code == 200:
        summary = response.json()
        print(f"✅ Session Finalized: {summary['message']}")
    else:
        print(f"❌ Finalize Failed: {response.text}")

def test_history(token):
    print_header("6. Attendance History")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Weekly History for a staff
    staff_id = "STF001"
    response = requests.get(f"{BASE_URL}/attendance/history/weekly/{staff_id}", headers=headers)
    if response.status_code == 200:
        hist = response.json()
        print(f"✅ Weekly History for {staff_id} retrieved ({len(hist)} days)")
    else:
        print(f"❌ History Failed: {response.text}")

if __name__ == "__main__":
    print("🚀 Starting Comprehensive Backend Test...")
    token = login()
    test_user_profile(token)
    test_group_management(token)
    test_dashboard_stats(token)
    test_attendance_flow(token)
    test_history(token)
    print("\n✅ All Tests Completed.")
