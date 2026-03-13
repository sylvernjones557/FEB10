import requests
import os

def test_system():
    print("=== STARTING FULL SYSTEM VALIDATION ===")
    base_url = "http://127.0.0.1:8000/api/v1"
    
    # 1. Check Frontend Build
    dist_path = r"e:\FEB10\frontend_smart_presence\dist"
    if os.path.exists(dist_path) and os.path.isdir(dist_path):
        print(f"[SUCCESS] Frontend Build (dist) found at: {dist_path}")
    else:
        print("[FAILURE] Frontend Build (dist) NOT FOUND!")

    # 2. Test Admin Login
    print("\n--- Testing Admin Authentication ---")
    try:
        login_res = requests.post(f"{base_url}/login/access-token", data={"username": "admin", "password": "admin"})
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            print("[SUCCESS] Admin Login successful.")
            me_res = requests.get(f"{base_url}/staff/me", headers={"Authorization": f"Bearer {token}"})
            if me_res.status_code == 200 and me_res.json()["is_superuser"]:
                print(f"[SUCCESS] Admin /me verified. Role: {me_res.json()['role']}")
            else:
                print(f"[FAILURE] Admin /me failed or role mismatch: {me_res.text}")
        else:
            print(f"[FAILURE] Admin Login failed: {login_res.status_code} - {login_res.text}")
    except Exception as e:
        print(f"[ERROR] Admin Login connection error: {e}")

    # 3. Test Teacher (testclass) Login
    print("\n--- Testing Teacher (testclass) Authentication ---")
    try:
        login_res = requests.post(f"{base_url}/login/access-token", data={"username": "testclass", "password": "testclass"})
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            print("[SUCCESS] testclass Login successful.")
            me_res = requests.get(f"{base_url}/staff/me", headers={"Authorization": f"Bearer {token}"})
            user_data = me_res.json()
            if me_res.status_code == 200 and user_data["role"] == "STAFF":
                print(f"[SUCCESS] testclass /me verified. Role: {user_data['role']}")
                print(f"[SUCCESS] Assigned Class ID: {user_data.get('assigned_class_id')}")
            else:
                print(f"[FAILURE] testclass /me failed: {me_res.text}")
        else:
            print(f"[FAILURE] testclass Login failed: {login_res.status_code} - {login_res.text}")
    except Exception as e:
        print(f"[ERROR] testclass Login connection error: {e}")

    # 4. Verify Groups & Test Class Existence
    print("\n--- Verifying Data Integrity ---")
    try:
        # Use admin token for full list
        headers = {"Authorization": f"Bearer {token}"} # Using last token (testclass can see groups too usually)
        groups_res = requests.get(f"{base_url}/groups/", headers=headers)
        if groups_res.status_code == 200:
            groups = groups_res.json()
            test_group = next((g for g in groups if "test" in (g["name"] or "").lower() or g["code"] == "TEST"), None)
            if test_group:
                print(f"[SUCCESS] 'Test Class' found in database: {test_group['name']} (ID: {test_group['id']})")
            else:
                print("[FAILURE] 'Test Class' NOT FOUND in group list!")
        else:
             print(f"[FAILURE] Failed to fetch groups: {groups_res.status_code}")
    except Exception as e:
        print(f"[ERROR] Data integrity check error: {e}")

    print("\n=== VALIDATION COMPLETE ===")

if __name__ == "__main__":
    test_system()
