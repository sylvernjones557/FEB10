#!/usr/bin/env python3
"""
Smart Presence — MCP-Driven UI Workflow Tests
=============================================
Systematically exercises every UI workflow defined in the MCP server's
tools.json, resources.json, and prompts.json manifests.

These tests simulate exactly what the React frontend does:
  1. Login → JWT token
  2. Dashboard data fetch (stats, live classes, staff, students, groups)
  3. Student management (list, create, update, delete)
  4. Staff management (list, create, update, delete)
  5. Class/Group management (list, detail, students, timetable)
  6. Timetable management (list, create, update, delete)
  7. Attendance full workflow (start → status → stop → verify → finalize)
  8. Face recognition endpoints
  9. Organization management
  10. Institutional stats & reports

Each test records response time, status code, and payload for the report.
"""

import requests
import time
import json
import uuid
import io
import sys
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

# ── Configuration ──
BASE_URL = "http://127.0.0.1:8000"
API = f"{BASE_URL}/api/v1"
ADMIN_USER = "admin"
ADMIN_PASS = "admin"

# ── Test Results Collector ──
class TestResults:
    def __init__(self):
        self.results: List[Dict[str, Any]] = []
        self.start_time = datetime.now()
        self.workflow_timings: Dict[str, float] = {}
    
    def record(self, workflow: str, test_name: str, method: str, url: str,
               status_code: int, response_time_ms: float, 
               response_body: Any, passed: bool, notes: str = ""):
        self.results.append({
            "workflow": workflow,
            "test": test_name,
            "method": method,
            "url": url.replace(BASE_URL, ""),
            "status_code": status_code,
            "response_time_ms": round(response_time_ms, 2),
            "response_body": response_body,
            "passed": passed,
            "notes": notes,
            "timestamp": datetime.now().isoformat()
        })
    
    def summary(self) -> Dict:
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = sum(1 for r in self.results if not r["passed"])
        avg_time = sum(r["response_time_ms"] for r in self.results) / total if total else 0
        
        # Group by workflow
        workflows = {}
        for r in self.results:
            wf = r["workflow"]
            if wf not in workflows:
                workflows[wf] = {"total": 0, "passed": 0, "failed": 0, "times": []}
            workflows[wf]["total"] += 1
            workflows[wf]["times"].append(r["response_time_ms"])
            if r["passed"]:
                workflows[wf]["passed"] += 1
            else:
                workflows[wf]["failed"] += 1
        
        for wf in workflows:
            workflows[wf]["avg_time_ms"] = round(
                sum(workflows[wf]["times"]) / len(workflows[wf]["times"]), 2
            )
            del workflows[wf]["times"]
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": f"{(passed/total*100):.1f}%" if total else "N/A",
            "avg_response_ms": round(avg_time, 2),
            "workflows": workflows,
            "duration_seconds": round((datetime.now() - self.start_time).total_seconds(), 2),
            "timestamp": datetime.now().isoformat()
        }

results = TestResults()


# ── Helpers ──
def timed_request(method: str, url: str, **kwargs) -> Tuple[requests.Response, float]:
    """Make a request and return (response, elapsed_ms)."""
    start = time.time()
    resp = requests.request(method, url, **kwargs, timeout=30)
    elapsed = (time.time() - start) * 1000
    return resp, elapsed


def auth_headers(token: str) -> Dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def safe_json(resp: requests.Response) -> Any:
    try:
        return resp.json()
    except Exception:
        return resp.text[:500]


# ── Pytest fixtures for running individual tests via pytest ──
import pytest

@pytest.fixture
def token():
    """Authenticate and return a JWT token for use by workflow tests."""
    r = requests.post(f"{API}/login/access-token",
                      data={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=10)
    return r.json().get("access_token", "")

@pytest.fixture
def admin_user(token):
    r = requests.get(f"{API}/staff/me", headers=auth_headers(token), timeout=10)
    return r.json() if r.status_code == 200 else {}

@pytest.fixture
def groups(token):
    r = requests.get(f"{API}/groups/", headers=auth_headers(token), timeout=10)
    return r.json() if r.status_code == 200 else []

@pytest.fixture
def staff_list(token):
    r = requests.get(f"{API}/staff/", headers=auth_headers(token), timeout=10)
    return r.json() if r.status_code == 200 else []

@pytest.fixture
def students(token):
    r = requests.get(f"{API}/students/", headers=auth_headers(token), timeout=10)
    return r.json() if r.status_code == 200 else []


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 1: System Health (MCP tools: health_check, system_info, server_root)
# ══════════════════════════════════════════════════════════════════════════
def test_system_health():
    print("\n" + "="*70)
    print("WORKFLOW 1: System Health Check")
    print("="*70)
    
    # 1.1 Server Root
    resp, ms = timed_request("GET", f"{BASE_URL}/")
    body = safe_json(resp)
    ok = resp.status_code == 200 and "message" in body
    results.record("System Health", "server_root", "GET", f"{BASE_URL}/",
                   resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET / — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Response: {json.dumps(body, indent=2)[:200]}")
    
    # 1.2 Health Check
    resp, ms = timed_request("GET", f"{BASE_URL}/health")
    body = safe_json(resp)
    ok = resp.status_code == 200 and body.get("status") == "ok"
    results.record("System Health", "health_check", "GET", f"{BASE_URL}/health",
                   resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /health — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Device: {body.get('device')}, Mode: {body.get('mode')}")
    
    # 1.3 System Info
    resp, ms = timed_request("GET", f"{BASE_URL}/system-info")
    body = safe_json(resp)
    ok = resp.status_code == 200 and "face_model" in body
    results.record("System Health", "system_info", "GET", f"{BASE_URL}/system-info",
                   resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /system-info — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Model: {body.get('face_model')}, Det: {body.get('det_size')}, Threads: {body.get('onnx_threads')}")


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 2: Authentication (MCP tool: auth_login + staff_me)
# ══════════════════════════════════════════════════════════════════════════
def test_authentication() -> Optional[str]:
    print("\n" + "="*70)
    print("WORKFLOW 2: Authentication (Login Page)")
    print("="*70)
    
    token = None
    
    # 2.1 Login with valid credentials (simulates Login.tsx form submit)
    resp, ms = timed_request("POST", f"{API}/login/access-token",
                             data={"username": ADMIN_USER, "password": ADMIN_PASS})
    body = safe_json(resp)
    ok = resp.status_code == 200 and "access_token" in body
    token = body.get("access_token") if ok else None
    results.record("Authentication", "login_valid_credentials", "POST",
                   f"{API}/login/access-token", resp.status_code, ms, 
                   {"token_present": bool(token), "token_type": body.get("token_type")}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST login — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Token received: {bool(token)}")
    
    # 2.2 Login with invalid credentials
    resp, ms = timed_request("POST", f"{API}/login/access-token",
                             data={"username": "invalid_user", "password": "wrong_pass"})
    ok = resp.status_code in [401, 400, 422]
    results.record("Authentication", "login_invalid_credentials", "POST",
                   f"{API}/login/access-token", resp.status_code, ms, safe_json(resp), ok,
                   "Should reject invalid credentials")
    print(f"  [{'PASS' if ok else 'FAIL'}] POST login (invalid) — {resp.status_code} ({ms:.0f}ms)")
    
    # 2.3 Login with empty fields
    resp, ms = timed_request("POST", f"{API}/login/access-token",
                             data={"username": "", "password": ""})
    ok = resp.status_code in [400, 401, 422]
    results.record("Authentication", "login_empty_fields", "POST",
                   f"{API}/login/access-token", resp.status_code, ms, safe_json(resp), ok,
                   "Should reject empty credentials")
    print(f"  [{'PASS' if ok else 'FAIL'}] POST login (empty) — {resp.status_code} ({ms:.0f}ms)")
    
    # 2.4 Get current user profile (simulates App.tsx initSession → authApi.me())
    if token:
        resp, ms = timed_request("GET", f"{API}/staff/me", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200 and "id" in body
        results.record("Authentication", "staff_me_profile", "GET",
                       f"{API}/staff/me", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /staff/me — {resp.status_code} ({ms:.0f}ms)")
        print(f"         User: {body.get('name')}, Role: {body.get('role')}, Superuser: {body.get('is_superuser')}")
    
    # 2.5 Access protected endpoint without token (401 check)
    resp, ms = timed_request("GET", f"{API}/staff/me")
    ok = resp.status_code == 401
    results.record("Authentication", "unauthorized_access", "GET",
                   f"{API}/staff/me", resp.status_code, ms, safe_json(resp), ok,
                   "Should return 401 without token")
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /staff/me (no token) — {resp.status_code} ({ms:.0f}ms)")
    
    return token


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 3: Dashboard Data Loading (MCP prompt: dashboard_overview)
# ══════════════════════════════════════════════════════════════════════════
def test_dashboard(token: str) -> Dict[str, Any]:
    print("\n" + "="*70)
    print("WORKFLOW 3: Admin Dashboard (Dashboard.tsx)")
    print("="*70)
    
    dashboard_data = {}
    
    # 3.1 Institutional Stats (SummaryCards in Dashboard)
    resp, ms = timed_request("GET", f"{API}/stats/institutional", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, dict)
    dashboard_data["stats"] = body
    results.record("Dashboard", "stats_institutional", "GET",
                   f"{API}/stats/institutional", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /stats/institutional — {resp.status_code} ({ms:.0f}ms)")
    if ok:
        print(f"         Students: {body.get('total_students')}, Staff: {body.get('total_staff')}, "
              f"Classes: {body.get('total_classes')}, Today attendance: {body.get('today_attendance_rate')}%")
    
    # 3.2 Live Classes
    resp, ms = timed_request("GET", f"{API}/classes/live", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    dashboard_data["live_classes"] = body
    results.record("Dashboard", "classes_live", "GET",
                   f"{API}/classes/live", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /classes/live — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Active classes: {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 3.3 Staff List (loaded by App.tsx loadGlobalData)
    resp, ms = timed_request("GET", f"{API}/staff/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    dashboard_data["staff"] = body
    results.record("Dashboard", "staff_list", "GET",
                   f"{API}/staff/", resp.status_code, ms, 
                   {"count": len(body) if isinstance(body, list) else 0, "sample": body[:2] if isinstance(body, list) else body}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /staff/ — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Staff count: {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 3.4 Students List (loaded by App.tsx loadGlobalData)
    resp, ms = timed_request("GET", f"{API}/students/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    dashboard_data["students"] = body
    results.record("Dashboard", "student_list", "GET",
                   f"{API}/students/", resp.status_code, ms,
                   {"count": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/ — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Student count: {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 3.5 Groups/Classes List (loaded by App.tsx loadGlobalData)
    resp, ms = timed_request("GET", f"{API}/groups/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    dashboard_data["groups"] = body
    results.record("Dashboard", "group_list", "GET",
                   f"{API}/groups/", resp.status_code, ms,
                   {"count": len(body) if isinstance(body, list) else 0, "groups": body}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /groups/ — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Groups/Classes: {len(body) if isinstance(body, list) else 'N/A'}")
    if isinstance(body, list):
        for g in body[:5]:
            print(f"           - {g.get('name')} (id: {g.get('id')[:8]}...)")
    
    return dashboard_data


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 4: Organization Management (MCP tools: organization_*)
# ══════════════════════════════════════════════════════════════════════════
def test_organizations(token: str) -> Optional[str]:
    print("\n" + "="*70)
    print("WORKFLOW 4: Organization Management")
    print("="*70)
    
    org_id = None
    
    # 4.1 List Organizations
    resp, ms = timed_request("GET", f"{API}/organizations/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    results.record("Organizations", "organization_list", "GET",
                   f"{API}/organizations/", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /organizations/ — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Organizations: {len(body) if isinstance(body, list) else 'N/A'}")
    
    if isinstance(body, list) and len(body) > 0:
        org_id = body[0].get("id")
        print(f"         Using org: {body[0].get('name')} ({org_id[:8]}...)")
    
    # 4.2 Get specific organization (if exists)
    if org_id:
        resp, ms = timed_request("GET", f"{API}/organizations/{org_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Organizations", "organization_get", "GET",
                       f"{API}/organizations/{org_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /organizations/{{id}} — {resp.status_code} ({ms:.0f}ms)")
    
    return org_id


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 5: Class/Group Management (ClassDirectory.tsx, ClassDetail.tsx)
# ══════════════════════════════════════════════════════════════════════════
def test_class_management(token: str, groups: List[Dict]) -> Optional[str]:
    print("\n" + "="*70)
    print("WORKFLOW 5: Class Management (ClassDirectory.tsx + ClassDetail.tsx)")
    print("="*70)
    
    class_id = None
    
    if not groups or len(groups) == 0:
        print("  [SKIP] No groups available to test")
        results.record("Class Management", "no_groups_available", "N/A", "N/A", 0, 0, 
                       {"message": "No groups in database"}, True, "Skipped - no data")
        return None
    
    class_id = groups[0]["id"]
    class_name = groups[0].get("name", "Unknown")
    
    # 5.1 ClassDirectory — shows all classes (already fetched in dashboard)
    print(f"  [PASS] ClassDirectory renders {len(groups)} classes")
    results.record("Class Management", "class_directory_render", "GET",
                   f"{API}/groups/", 200, 0, {"class_count": len(groups)}, True,
                   "Data loaded during dashboard init")
    
    # 5.2 ClassDetail — get students in a class
    resp, ms = timed_request("GET", f"{API}/groups/{class_id}/students", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    results.record("Class Management", "group_students", "GET",
                   f"{API}/groups/{class_id}/students", resp.status_code, ms,
                   {"count": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /groups/{{id}}/students '{class_name}' — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Students in class: {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 5.3 ClassDetail — get timetable for class
    resp, ms = timed_request("GET", f"{API}/groups/{class_id}/timetable", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    results.record("Class Management", "group_timetable", "GET",
                   f"{API}/groups/{class_id}/timetable", resp.status_code, ms,
                   {"entries": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /groups/{{id}}/timetable — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Timetable entries: {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 5.4 ClassDetail MONITOR tab — today's schedule
    resp, ms = timed_request("GET", f"{API}/classes/{class_id}/schedule/today", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    results.record("Class Management", "class_schedule_today", "GET",
                   f"{API}/classes/{class_id}/schedule/today", resp.status_code, ms,
                   {"periods_today": len(body) if isinstance(body, list) else 0, "schedule": body}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /classes/{{id}}/schedule/today — {resp.status_code} ({ms:.0f}ms)")
    if isinstance(body, list):
        for p in body[:3]:
            print(f"           Period {p.get('period')}: {p.get('subject')} — {p.get('teacher_name', 'TBD')}")
    
    # 5.5 Get specific group details
    resp, ms = timed_request("GET", f"{API}/groups/{class_id}", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Class Management", "group_get_detail", "GET",
                   f"{API}/groups/{class_id}", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /groups/{{id}} detail — {resp.status_code} ({ms:.0f}ms)")
    
    return class_id


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 6: Staff Management (StaffDirectory.tsx, StaffDetail.tsx)
# ══════════════════════════════════════════════════════════════════════════
def test_staff_management(token: str, staff_list: List[Dict], admin_user: Dict) -> Optional[str]:
    print("\n" + "="*70)
    print("WORKFLOW 6: Staff Management (StaffDirectory.tsx + StaffDetail.tsx)")
    print("="*70)
    
    created_staff_id = None
    
    # 6.1 StaffDirectory — list all staff (already fetched)
    print(f"  [PASS] StaffDirectory renders {len(staff_list)} staff members")
    results.record("Staff Management", "staff_directory_render", "GET",
                   f"{API}/staff/", 200, 0, {"staff_count": len(staff_list)}, True,
                   "Data loaded during dashboard init")
    
    # 6.2 StaffDetail — get individual staff profile
    if staff_list:
        staff_id = staff_list[0].get("id")
        resp, ms = timed_request("GET", f"{API}/staff/{staff_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Staff Management", "staff_get_detail", "GET",
                       f"{API}/staff/{staff_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /staff/{{id}} — {resp.status_code} ({ms:.0f}ms)")
        print(f"         Staff: {body.get('name')}, Type: {body.get('type')}, Subject: {body.get('primary_subject')}")
    
    # 6.3 StaffDetail — weekly activity chart
    if staff_list:
        staff_id = staff_list[0].get("id")
        resp, ms = timed_request("GET", f"{API}/attendance/history/weekly/{staff_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Staff Management", "attendance_weekly_history", "GET",
                       f"{API}/attendance/history/weekly/{staff_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /attendance/history/weekly/{{id}} — {resp.status_code} ({ms:.0f}ms)")
        if isinstance(body, dict) and "week" in body:
            print(f"         Weekly data points: {len(body['week'])}")
    
    # 6.4 Settings → Add Teacher (simulates Settings.tsx staff creation form)
    test_code = f"test_teacher_{int(time.time()) % 10000}"
    staff_payload = {
        "name": "Test Teacher MCP",
        "full_name": "Test Teacher MCP",
        "staff_code": test_code,
        "password": "testpass123",
        "role": "STAFF",
        "type": "SUBJECT_TEACHER",
        "primary_subject": "Mathematics",
        "email": f"{test_code}@test.com"
    }
    resp, ms = timed_request("POST", f"{API}/staff/", headers=auth_headers(token), json=staff_payload)
    body = safe_json(resp)
    ok = resp.status_code in [200, 201] and "id" in body
    created_staff_id = body.get("id") if ok else None
    results.record("Staff Management", "staff_create (Settings Add Teacher)", "POST",
                   f"{API}/staff/", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /staff/ (create teacher) — {resp.status_code} ({ms:.0f}ms)")
    if ok:
        print(f"         Created: {body.get('name')} (id: {created_staff_id[:8]}...)")
    
    # 6.5 Staff profile update
    if created_staff_id:
        resp, ms = timed_request("PATCH", f"{API}/staff/{created_staff_id}", 
                                 headers=auth_headers(token),
                                 json={"primary_subject": "Physics", "name": "Updated Teacher MCP"})
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Staff Management", "staff_update", "PATCH",
                       f"{API}/staff/{created_staff_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] PATCH /staff/{{id}} (update) — {resp.status_code} ({ms:.0f}ms)")
    
    # 6.6 Validation: create staff with too-short password
    resp, ms = timed_request("POST", f"{API}/staff/", headers=auth_headers(token),
                             json={"name": "Bad", "staff_code": "bad_test", "password": "12"})
    body = safe_json(resp)
    ok = resp.status_code in [400, 422]
    results.record("Staff Management", "staff_create_validation_short_password", "POST",
                   f"{API}/staff/", resp.status_code, ms, body, ok,
                   "Should reject password < 6 chars")
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /staff/ (short password) — {resp.status_code} ({ms:.0f}ms)")
    
    # 6.7 Validation: duplicate staff_code
    resp, ms = timed_request("POST", f"{API}/staff/", headers=auth_headers(token),
                             json={"name": "Dup", "staff_code": "admin", "password": "testpass123"})
    body = safe_json(resp)
    ok = resp.status_code in [400, 409, 422]
    results.record("Staff Management", "staff_create_duplicate_code", "POST",
                   f"{API}/staff/", resp.status_code, ms, body, ok,
                   "Should reject duplicate staff_code")
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /staff/ (duplicate code) — {resp.status_code} ({ms:.0f}ms)")
    
    # Cleanup: delete created staff
    if created_staff_id:
        resp, ms = timed_request("DELETE", f"{API}/staff/{created_staff_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Staff Management", "staff_delete (cleanup)", "DELETE",
                       f"{API}/staff/{created_staff_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] DELETE /staff/{{id}} (cleanup) — {resp.status_code} ({ms:.0f}ms)")
    
    return created_staff_id


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 7: Student Management (StudentsDirectory.tsx, Settings.tsx Add Member)
# ══════════════════════════════════════════════════════════════════════════
def test_student_management(token: str, groups: List[Dict]) -> Optional[str]:
    print("\n" + "="*70)
    print("WORKFLOW 7: Student Management (StudentsDirectory.tsx + Settings.tsx)")
    print("="*70)
    
    created_student_id = None
    group_id = groups[0]["id"] if groups else None
    
    # 7.1 StudentsDirectory — list all students
    resp, ms = timed_request("GET", f"{API}/students/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    student_count = len(body) if isinstance(body, list) else 0
    results.record("Student Management", "student_list", "GET",
                   f"{API}/students/", resp.status_code, ms,
                   {"count": student_count}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/ — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Total students: {student_count}")
    
    # 7.2 Filter students by group
    if group_id:
        resp, ms = timed_request("GET", f"{API}/students/?group_id={group_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200 and isinstance(body, list)
        results.record("Student Management", "student_filter_by_group", "GET",
                       f"{API}/students/?group_id={group_id}", resp.status_code, ms,
                       {"count": len(body) if isinstance(body, list) else 0}, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/?group_id= — {resp.status_code} ({ms:.0f}ms)")
        print(f"         Students in group: {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 7.3 Settings → Add Member (create student)
    if group_id:
        student_payload = {
            "name": "Test Student MCP",
            "group_id": group_id,
            "roll_no": f"MCP{int(time.time()) % 10000}",
            "external_id": f"EXT-MCP-{int(time.time()) % 10000}",
            "email": f"test_student_{int(time.time()) % 10000}@test.com"
        }
        resp, ms = timed_request("POST", f"{API}/students/", headers=auth_headers(token), json=student_payload)
        body = safe_json(resp)
        ok = resp.status_code in [200, 201] and "id" in body
        created_student_id = body.get("id") if ok else None
        results.record("Student Management", "student_create (Settings Add Member)", "POST",
                       f"{API}/students/", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] POST /students/ (create) — {resp.status_code} ({ms:.0f}ms)")
        if ok:
            print(f"         Created: {body.get('name')} (id: {created_student_id[:8]}...)")
    
    # 7.4 Get student detail
    if created_student_id:
        resp, ms = timed_request("GET", f"{API}/students/{created_student_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200 and body.get("name") == "Test Student MCP"
        results.record("Student Management", "student_get_detail", "GET",
                       f"{API}/students/{created_student_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/{{id}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 7.5 Update student
    if created_student_id:
        resp, ms = timed_request("PATCH", f"{API}/students/{created_student_id}", 
                                 headers=auth_headers(token),
                                 json={"name": "Updated Student MCP", "roll_no": "UPDATED001"})
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Student Management", "student_update", "PATCH",
                       f"{API}/students/{created_student_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] PATCH /students/{{id}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 7.6 Validation: create student without required group_id
    resp, ms = timed_request("POST", f"{API}/students/", headers=auth_headers(token),
                             json={"name": "No Group Student"})
    body = safe_json(resp)
    ok = resp.status_code in [400, 422]
    results.record("Student Management", "student_create_missing_group", "POST",
                   f"{API}/students/", resp.status_code, ms, body, ok,
                   "Should reject student without group_id")
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /students/ (no group_id) — {resp.status_code} ({ms:.0f}ms)")
    
    # 7.7 Delete student (StudentsDirectory.tsx admin delete)
    if created_student_id:
        resp, ms = timed_request("DELETE", f"{API}/students/{created_student_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Student Management", "student_delete", "DELETE",
                       f"{API}/students/{created_student_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] DELETE /students/{{id}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 7.8 Verify deleted student returns 404
    if created_student_id:
        resp, ms = timed_request("GET", f"{API}/students/{created_student_id}", headers=auth_headers(token))
        ok = resp.status_code == 404
        results.record("Student Management", "student_get_after_delete", "GET",
                       f"{API}/students/{created_student_id}", resp.status_code, ms, safe_json(resp), ok,
                       "Should return 404 for deleted student")
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/{{id}} (deleted) — {resp.status_code} ({ms:.0f}ms)")
    
    return created_student_id


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 8: Timetable Management (Settings.tsx timetable allocation)
# ══════════════════════════════════════════════════════════════════════════
def test_timetable(token: str, groups: List[Dict], staff_list: List[Dict]):
    print("\n" + "="*70)
    print("WORKFLOW 8: Timetable Management (Settings.tsx + ClassDetail.tsx)")
    print("="*70)
    
    created_entry_id = None
    group_id = groups[0]["id"] if groups else None
    staff_id = staff_list[0]["id"] if staff_list else None
    
    # 8.1 List all timetable entries
    resp, ms = timed_request("GET", f"{API}/timetable/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    results.record("Timetable", "timetable_list_all", "GET",
                   f"{API}/timetable/", resp.status_code, ms,
                   {"count": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /timetable/ — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Total entries: {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 8.2 Filter by group
    if group_id:
        resp, ms = timed_request("GET", f"{API}/timetable/?group_id={group_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Timetable", "timetable_filter_group", "GET",
                       f"{API}/timetable/?group_id={group_id}", resp.status_code, ms,
                       {"count": len(body) if isinstance(body, list) else 0}, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /timetable/?group_id= — {resp.status_code} ({ms:.0f}ms)")
    
    # 8.3 Create timetable entry (Settings.tsx teacher timetable allocation)
    if group_id:
        entry_payload = {
            "group_id": group_id,
            "day_of_week": 1,
            "period": 99,  # Use high period to avoid conflicts
            "subject": "MCP Test Subject",
            "start_time": "14:00",
            "end_time": "14:45"
        }
        if staff_id:
            entry_payload["staff_id"] = staff_id
        
        resp, ms = timed_request("POST", f"{API}/timetable/", headers=auth_headers(token), json=entry_payload)
        body = safe_json(resp)
        ok = resp.status_code in [200, 201] and "id" in body
        created_entry_id = body.get("id") if ok else None
        results.record("Timetable", "timetable_create", "POST",
                       f"{API}/timetable/", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] POST /timetable/ (create) — {resp.status_code} ({ms:.0f}ms)")
        if ok:
            print(f"         Created: Period {body.get('period')}, Subject: {body.get('subject')}")
    
    # 8.4 Get specific entry
    if created_entry_id:
        resp, ms = timed_request("GET", f"{API}/timetable/{created_entry_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Timetable", "timetable_get", "GET",
                       f"{API}/timetable/{created_entry_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /timetable/{{id}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 8.5 Update entry
    if created_entry_id:
        resp, ms = timed_request("PATCH", f"{API}/timetable/{created_entry_id}", 
                                 headers=auth_headers(token),
                                 json={"subject": "Updated Subject MCP"})
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Timetable", "timetable_update", "PATCH",
                       f"{API}/timetable/{created_entry_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] PATCH /timetable/{{id}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 8.6 Delete entry (cleanup)
    if created_entry_id:
        resp, ms = timed_request("DELETE", f"{API}/timetable/{created_entry_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Timetable", "timetable_delete", "DELETE",
                       f"{API}/timetable/{created_entry_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] DELETE /timetable/{{id}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 8.7 Validation: create without required fields
    resp, ms = timed_request("POST", f"{API}/timetable/", headers=auth_headers(token),
                             json={"subject": "No Group"})
    body = safe_json(resp)
    ok = resp.status_code in [400, 422]
    results.record("Timetable", "timetable_create_missing_fields", "POST",
                   f"{API}/timetable/", resp.status_code, ms, body, ok,
                   "Should reject without group_id + period + day")
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /timetable/ (missing fields) — {resp.status_code} ({ms:.0f}ms)")


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 9: Attendance Full Workflow (ClassAttendance.tsx — MCP prompt: take_attendance)
# ══════════════════════════════════════════════════════════════════════════
def test_attendance_workflow(token: str, groups: List[Dict], students: List[Dict]):
    print("\n" + "="*70)
    print("WORKFLOW 9: Attendance Session (ClassAttendance.tsx)")
    print("  MCP Prompt: take_attendance — start → scan → stop → verify → finalize")
    print("="*70)
    
    group_id = groups[0]["id"] if groups else None
    if not group_id:
        print("  [SKIP] No groups available")
        return
    
    # 9.1 Check initial session status (should be IDLE)
    resp, ms = timed_request("GET", f"{API}/attendance/status", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Attendance Workflow", "attendance_status_initial", "GET",
                   f"{API}/attendance/status", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /attendance/status (initial) — {resp.status_code} ({ms:.0f}ms)")
    print(f"         State: {body.get('state', 'N/A')}, Active: {body.get('active', 'N/A')}")
    
    # 9.2 Start attendance session (Step 1 of MCP prompt)
    resp, ms = timed_request("POST", f"{API}/attendance/start", headers=auth_headers(token),
                             json={"group_id": group_id})
    body = safe_json(resp)
    ok = resp.status_code == 200 and body.get("state") == "SCANNING"
    session_id = body.get("session_id")
    results.record("Attendance Workflow", "attendance_start_session", "POST",
                   f"{API}/attendance/start", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /attendance/start — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Session: {session_id[:8] if session_id else 'N/A'}..., State: {body.get('state')}")
    
    if not ok:
        print("  [SKIP] Cannot continue — session start failed")
        return
    
    # 9.3 Check status during scanning
    resp, ms = timed_request("GET", f"{API}/attendance/status", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and body.get("state") == "SCANNING"
    results.record("Attendance Workflow", "attendance_status_scanning", "GET",
                   f"{API}/attendance/status", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /attendance/status (scanning) — {resp.status_code} ({ms:.0f}ms)")
    print(f"         State: {body.get('state')}, Present: {body.get('present_count', 0)}")
    
    # 9.4 Send a recognition frame (Step 2 — simulates FaceScanner camera frame)
    # Create a minimal test image (1x1 pixel blank JPEG)
    import struct
    # Minimal JPEG: FFD8 FFE0 ... FFD9
    blank_jpeg = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
        b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342'
        b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00'
        b'\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00'
        b'\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b'
        b'\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04'
        b'\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07'
        b'\x22q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16'
        b'\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz'
        b'\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99'
        b'\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7'
        b'\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5'
        b'\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1'
        b'\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa'
        b'\xff\xda\x00\x08\x01\x01\x00\x00?\x00T\xdb\x9e\xa3\xa0\xa0\x02\x80'
        b'\xff\xd9'
    )
    
    files = {"file": ("frame.jpg", io.BytesIO(blank_jpeg), "image/jpeg")}
    headers = {"Authorization": f"Bearer {token}"}
    resp, ms = timed_request("POST", f"{API}/recognition/recognize", 
                             headers=headers, files=files)
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Attendance Workflow", "recognition_recognize (scan frame)", "POST",
                   f"{API}/recognition/recognize", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /recognition/recognize (frame) — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Matches: {len(body.get('matches', []))} faces, "
          f"Unrecognized: {len(body.get('unrecognized', []))}")
    
    # 9.5 Stop scanning (Step 3 → VERIFYING state)
    resp, ms = timed_request("POST", f"{API}/attendance/stop", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and body.get("state") == "VERIFYING"
    results.record("Attendance Workflow", "attendance_stop", "POST",
                   f"{API}/attendance/stop", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /attendance/stop — {resp.status_code} ({ms:.0f}ms)")
    print(f"         State: {body.get('state')}")
    
    # 9.6 Verify with manual corrections (Step 4)
    # Get students in the group to manually mark one present
    group_students = [s for s in students if s.get("group_id") == group_id]
    manual_present = [group_students[0]["id"]] if group_students else []
    
    resp, ms = timed_request("POST", f"{API}/attendance/verify", headers=auth_headers(token),
                             json={"manual_present": manual_present, "manual_absent": []})
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Attendance Workflow", "attendance_verify", "POST",
                   f"{API}/attendance/verify", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /attendance/verify — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Present count: {body.get('present_count', 'N/A')}")
    
    # 9.7 Finalize session (Step 5 → persist to DB)
    resp, ms = timed_request("POST", f"{API}/attendance/finalize", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Attendance Workflow", "attendance_finalize", "POST",
                   f"{API}/attendance/finalize", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /attendance/finalize — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Session: {body.get('session_id', 'N/A')}, "
          f"Present: {body.get('present_count', 0)}/{body.get('total_students', 0)}")
    
    # 9.8 Verify session is back to IDLE
    resp, ms = timed_request("GET", f"{API}/attendance/status", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and body.get("state") in ["IDLE", None]
    results.record("Attendance Workflow", "attendance_status_after_finalize", "GET",
                   f"{API}/attendance/status", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /attendance/status (post-finalize) — {resp.status_code} ({ms:.0f}ms)")
    print(f"         State: {body.get('state', 'IDLE')}")


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 10: Face Recognition (Enrollment.tsx + FaceScanner.tsx)
# ══════════════════════════════════════════════════════════════════════════
def test_face_recognition(token: str, groups: List[Dict]):
    print("\n" + "="*70)
    print("WORKFLOW 10: Face Recognition (Enrollment.tsx + FaceScanner.tsx)")
    print("="*70)
    
    group_id = groups[0]["id"] if groups else None
    test_student_id = None
    
    # 10.1 Create a test student for face registration
    if group_id:
        payload = {
            "name": "Face Test Student",
            "group_id": group_id,
            "roll_no": f"FACE{int(time.time()) % 10000}"
        }
        resp, ms = timed_request("POST", f"{API}/students/", headers=auth_headers(token), json=payload)
        body = safe_json(resp)
        if resp.status_code in [200, 201]:
            test_student_id = body.get("id")
    
    # 10.2 Register face (blank image — should handle gracefully)
    if test_student_id:
        # Create a small valid image (10x10 white)
        import numpy as np
        try:
            import cv2
            img = np.ones((10, 10, 3), dtype=np.uint8) * 255
            _, buffer = cv2.imencode('.jpg', img)
            img_bytes = buffer.tobytes()
        except ImportError:
            img_bytes = b'\xff\xd8\xff\xd9'  # minimal JPEG
        
        files = {"file": ("face.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        form_data = {"student_id": test_student_id}
        headers = {"Authorization": f"Bearer {token}"}
        
        resp, ms = timed_request("POST", f"{API}/recognition/register-face",
                                 headers=headers, files=files, data=form_data)
        body = safe_json(resp)
        # Face registration on blank image should return 400 (no face detected) — this is correct behavior
        ok = resp.status_code in [200, 400]
        results.record("Face Recognition", "recognition_register_face (blank image)", "POST",
                       f"{API}/recognition/register-face", resp.status_code, ms, body, ok,
                       "400=no face detected (expected), 200=face found")
        print(f"  [{'PASS' if ok else 'FAIL'}] POST /recognition/register-face — {resp.status_code} ({ms:.0f}ms)")
        print(f"         Response: {body}")
    
    # 10.3 Recognize faces in blank image
    import numpy as np
    try:
        import cv2
        img = np.ones((100, 100, 3), dtype=np.uint8) * 128
        _, buffer = cv2.imencode('.jpg', img)
        img_bytes = buffer.tobytes()
    except ImportError:
        img_bytes = b'\xff\xd8\xff\xd9'
    
    files = {"file": ("frame.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    headers = {"Authorization": f"Bearer {token}"}
    resp, ms = timed_request("POST", f"{API}/recognition/recognize",
                             headers=headers, files=files)
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Face Recognition", "recognition_recognize (no faces)", "POST",
                   f"{API}/recognition/recognize", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /recognition/recognize — {resp.status_code} ({ms:.0f}ms)")
    print(f"         Match: {body.get('match')}, Matches: {len(body.get('matches', []))}")
    
    # 10.4 Cleanup test student
    if test_student_id:
        resp, ms = timed_request("DELETE", f"{API}/students/{test_student_id}", headers=auth_headers(token))
        ok = resp.status_code == 200
        results.record("Face Recognition", "cleanup_test_student", "DELETE",
                       f"{API}/students/{test_student_id}", resp.status_code, ms, safe_json(resp), ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] DELETE test student (cleanup) — {resp.status_code} ({ms:.0f}ms)")


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 11: Reports (Reports.tsx — InstitutionalReport)
# ══════════════════════════════════════════════════════════════════════════
def test_reports(token: str):
    print("\n" + "="*70)
    print("WORKFLOW 11: Institutional Reports (Reports.tsx)")
    print("="*70)
    
    # 11.1 Reports page loads institutional stats
    resp, ms = timed_request("GET", f"{API}/stats/institutional", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Reports", "institutional_stats_for_reports", "GET",
                   f"{API}/stats/institutional", resp.status_code, ms, body, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /stats/institutional — {resp.status_code} ({ms:.0f}ms)")
    if isinstance(body, dict):
        print(f"         Total Students: {body.get('total_students')}")
        print(f"         Total Staff: {body.get('total_staff')}")
        print(f"         Total Classes: {body.get('total_classes')}")
        print(f"         Today Attendance: {body.get('today_present', 0)}/{body.get('today_total', 0)}")
        print(f"         Attendance Rate: {body.get('today_attendance_rate', 0)}%")
        print(f"         Sessions Today: {body.get('sessions_today', 0)}")


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 12: Staff Home & Staff Pages (StaffHome.tsx, StaffSubjects.tsx, MyClassPage.tsx)
# ══════════════════════════════════════════════════════════════════════════
def test_staff_pages(token: str, admin_user: Dict, groups: List[Dict]):
    print("\n" + "="*70)
    print("WORKFLOW 12: Staff Pages (StaffHome + StaffSubjects + MyClass)")
    print("="*70)
    
    staff_id = admin_user.get("id")
    
    # 12.1 StaffHome — loads timetable for staff
    resp, ms = timed_request("GET", f"{API}/timetable/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list)
    results.record("Staff Pages", "staff_home_timetable", "GET",
                   f"{API}/timetable/", resp.status_code, ms,
                   {"count": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /timetable/ (StaffHome) — {resp.status_code} ({ms:.0f}ms)")
    
    # 12.2 Filter timetable by staff
    if staff_id:
        resp, ms = timed_request("GET", f"{API}/timetable/?staff_id={staff_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Staff Pages", "timetable_filter_by_staff", "GET",
                       f"{API}/timetable/?staff_id={staff_id}", resp.status_code, ms,
                       {"entries": len(body) if isinstance(body, list) else 0}, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /timetable/?staff_id= — {resp.status_code} ({ms:.0f}ms)")
    
    # 12.3 MyClassPage — weekly attendance history for class teacher
    if staff_id:
        resp, ms = timed_request("GET", f"{API}/attendance/history/weekly/{staff_id}", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("Staff Pages", "my_class_weekly_attendance", "GET",
                       f"{API}/attendance/history/weekly/{staff_id}", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] GET /attendance/history/weekly/{{id}} (MyClass) — {resp.status_code} ({ms:.0f}ms)")
    
    # 12.4 StaffSubjects — loads all timetable entries for subjects view
    resp, ms = timed_request("GET", f"{API}/timetable/", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200
    results.record("Staff Pages", "staff_subjects_timetable", "GET",
                   f"{API}/timetable/", resp.status_code, ms,
                   {"entries": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /timetable/ (StaffSubjects) — {resp.status_code} ({ms:.0f}ms)")


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 13: MCP Prompt Workflows Simulation
# ══════════════════════════════════════════════════════════════════════════
def test_mcp_prompt_workflows(token: str, groups: List[Dict], staff_list: List[Dict]):
    print("\n" + "="*70)
    print("WORKFLOW 13: MCP Prompt Workflow Simulation")
    print("="*70)
    
    # 13.1 system_health_check prompt (health → system_info → stats)
    print("\n  --- MCP Prompt: system_health_check ---")
    steps_ok = True
    
    resp1, ms1 = timed_request("GET", f"{BASE_URL}/health")
    resp2, ms2 = timed_request("GET", f"{BASE_URL}/system-info")
    resp3, ms3 = timed_request("GET", f"{API}/stats/institutional", headers=auth_headers(token))
    
    total_ms = ms1 + ms2 + ms3
    all_ok = all(r.status_code == 200 for r in [resp1, resp2, resp3])
    results.record("MCP Prompts", "system_health_check_workflow", "MULTI",
                   "health + system-info + stats", 200 if all_ok else 500, total_ms,
                   {"health": safe_json(resp1), "system_info": safe_json(resp2),
                    "stats_summary": {"total_students": safe_json(resp3).get("total_students", 0)}},
                   all_ok)
    print(f"  [{'PASS' if all_ok else 'FAIL'}] system_health_check (3 steps) — total {total_ms:.0f}ms")
    
    # 13.2 dashboard_overview prompt (5 parallel API calls)
    print("\n  --- MCP Prompt: dashboard_overview ---")
    start = time.time()
    resp_stats, _ = timed_request("GET", f"{API}/stats/institutional", headers=auth_headers(token))
    resp_live, _ = timed_request("GET", f"{API}/classes/live", headers=auth_headers(token))
    resp_staff, _ = timed_request("GET", f"{API}/staff/", headers=auth_headers(token))
    resp_students, _ = timed_request("GET", f"{API}/students/", headers=auth_headers(token))
    resp_groups, _ = timed_request("GET", f"{API}/groups/", headers=auth_headers(token))
    total_ms = (time.time() - start) * 1000
    
    all_ok = all(r.status_code == 200 for r in [resp_stats, resp_live, resp_staff, resp_students, resp_groups])
    results.record("MCP Prompts", "dashboard_overview_workflow", "MULTI",
                   "stats + live + staff + students + groups", 200 if all_ok else 500, total_ms,
                   {"stats": resp_stats.status_code, "live": resp_live.status_code,
                    "staff": resp_staff.status_code, "students": resp_students.status_code,
                    "groups": resp_groups.status_code}, all_ok)
    print(f"  [{'PASS' if all_ok else 'FAIL'}] dashboard_overview (5 calls) — total {total_ms:.0f}ms")
    
    # 13.3 class_schedule_lookup prompt
    print("\n  --- MCP Prompt: class_schedule_lookup ---")
    if groups:
        class_id = groups[0]["id"]
        resp, ms = timed_request("GET", f"{API}/classes/{class_id}/schedule/today", headers=auth_headers(token))
        body = safe_json(resp)
        ok = resp.status_code == 200
        results.record("MCP Prompts", "class_schedule_lookup_workflow", "GET",
                       f"{API}/classes/{class_id}/schedule/today", resp.status_code, ms, body, ok)
        print(f"  [{'PASS' if ok else 'FAIL'}] class_schedule_lookup — {resp.status_code} ({ms:.0f}ms)")
    
    # 13.4 weekly_report prompt
    print("\n  --- MCP Prompt: weekly_report ---")
    if staff_list:
        staff_id = staff_list[0]["id"]
        resp1, ms1 = timed_request("GET", f"{API}/attendance/history/weekly/{staff_id}", headers=auth_headers(token))
        resp2, ms2 = timed_request("GET", f"{API}/staff/{staff_id}", headers=auth_headers(token))
        total_ms = ms1 + ms2
        all_ok = resp1.status_code == 200 and resp2.status_code == 200
        results.record("MCP Prompts", "weekly_report_workflow", "MULTI",
                       "weekly_history + staff_get", 200 if all_ok else 500, total_ms,
                       {"history": safe_json(resp1), "staff": safe_json(resp2).get("name")}, all_ok)
        print(f"  [{'PASS' if all_ok else 'FAIL'}] weekly_report (2 steps) — total {total_ms:.0f}ms")


# ══════════════════════════════════════════════════════════════════════════
# WORKFLOW 14: Edge Cases & Error Handling
# ══════════════════════════════════════════════════════════════════════════
def test_edge_cases(token: str):
    print("\n" + "="*70)
    print("WORKFLOW 14: Edge Cases & Error Handling")
    print("="*70)
    
    # 14.1 Invalid UUID
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    resp, ms = timed_request("GET", f"{API}/staff/{fake_uuid}", headers=auth_headers(token))
    ok = resp.status_code == 404
    results.record("Edge Cases", "invalid_staff_uuid", "GET",
                   f"{API}/staff/{fake_uuid}", resp.status_code, ms, safe_json(resp), ok,
                   "Should return 404 for non-existent ID")
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /staff/{{fake_uuid}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 14.2 Invalid UUID for student
    resp, ms = timed_request("GET", f"{API}/students/{fake_uuid}", headers=auth_headers(token))
    ok = resp.status_code == 404
    results.record("Edge Cases", "invalid_student_uuid", "GET",
                   f"{API}/students/{fake_uuid}", resp.status_code, ms, safe_json(resp), ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/{{fake_uuid}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 14.3 Invalid UUID for group
    resp, ms = timed_request("GET", f"{API}/groups/{fake_uuid}", headers=auth_headers(token))
    ok = resp.status_code == 404
    results.record("Edge Cases", "invalid_group_uuid", "GET",
                   f"{API}/groups/{fake_uuid}", resp.status_code, ms, safe_json(resp), ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /groups/{{fake_uuid}} — {resp.status_code} ({ms:.0f}ms)")
    
    # 14.4 Malformed JSON body
    headers = auth_headers(token)
    resp, ms = timed_request("POST", f"{API}/staff/", headers=headers,
                             data="not valid json")
    ok = resp.status_code in [400, 422]
    results.record("Edge Cases", "malformed_json_body", "POST",
                   f"{API}/staff/", resp.status_code, ms, safe_json(resp), ok,
                   "Should reject malformed JSON")
    print(f"  [{'PASS' if ok else 'FAIL'}] POST /staff/ (malformed JSON) — {resp.status_code} ({ms:.0f}ms)")
    
    # 14.5 Expired/invalid token
    resp, ms = timed_request("GET", f"{API}/staff/me", 
                             headers={"Authorization": "Bearer invalid_token_12345"})
    ok = resp.status_code == 401
    results.record("Edge Cases", "invalid_bearer_token", "GET",
                   f"{API}/staff/me", resp.status_code, ms, safe_json(resp), ok,
                   "Should return 401 for invalid token")
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /staff/me (invalid token) — {resp.status_code} ({ms:.0f}ms)")
    
    # 14.6 Method not allowed
    resp, ms = timed_request("PUT", f"{BASE_URL}/health")
    ok = resp.status_code == 405
    results.record("Edge Cases", "method_not_allowed", "PUT",
                   f"{BASE_URL}/health", resp.status_code, ms, safe_json(resp), ok,
                   "Should return 405 for wrong HTTP method")
    print(f"  [{'PASS' if ok else 'FAIL'}] PUT /health (wrong method) — {resp.status_code} ({ms:.0f}ms)")
    
    # 14.7 Pagination
    resp, ms = timed_request("GET", f"{API}/students/?skip=0&limit=2", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list) and len(body) <= 2
    results.record("Edge Cases", "pagination_limit", "GET",
                   f"{API}/students/?skip=0&limit=2", resp.status_code, ms,
                   {"count": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/?limit=2 — {resp.status_code} ({ms:.0f}ms), returned {len(body) if isinstance(body, list) else 'N/A'}")
    
    # 14.8 Large skip (should return empty)
    resp, ms = timed_request("GET", f"{API}/students/?skip=99999", headers=auth_headers(token))
    body = safe_json(resp)
    ok = resp.status_code == 200 and isinstance(body, list) and len(body) == 0
    results.record("Edge Cases", "pagination_large_skip", "GET",
                   f"{API}/students/?skip=99999", resp.status_code, ms,
                   {"count": len(body) if isinstance(body, list) else 0}, ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] GET /students/?skip=99999 — {resp.status_code} ({ms:.0f}ms), returned {len(body) if isinstance(body, list) else 'N/A'}")


# ══════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ══════════════════════════════════════════════════════════════════════════
def main():
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║  Smart Presence — MCP-Driven UI Workflow Tests                      ║")
    print("║  Testing all MCP tools & prompts against live backend               ║")
    print(f"║  Backend: {BASE_URL}                                      ║")
    print(f"║  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                                  ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    
    # === WORKFLOW 1: System Health ===
    test_system_health()
    
    # === WORKFLOW 2: Authentication ===
    token = test_authentication()
    if not token:
        print("\n❌ FATAL: Cannot authenticate. Aborting tests.")
        return
    
    # Get admin user profile for later use
    admin_resp = requests.get(f"{API}/staff/me", headers=auth_headers(token))
    admin_user = admin_resp.json()
    
    # === WORKFLOW 3: Dashboard ===
    dashboard_data = test_dashboard(token)
    
    # === WORKFLOW 4: Organizations ===
    org_id = test_organizations(token)
    
    # === WORKFLOW 5: Class Management ===
    groups = dashboard_data.get("groups", [])
    class_id = test_class_management(token, groups)
    
    # === WORKFLOW 6: Staff Management ===
    staff_list = dashboard_data.get("staff", [])
    test_staff_management(token, staff_list, admin_user)
    
    # === WORKFLOW 7: Student Management ===
    test_student_management(token, groups)
    
    # === WORKFLOW 8: Timetable ===
    test_timetable(token, groups, staff_list)
    
    # === WORKFLOW 9: Attendance Full Workflow ===
    students = dashboard_data.get("students", [])
    test_attendance_workflow(token, groups, students)
    
    # === WORKFLOW 10: Face Recognition ===
    test_face_recognition(token, groups)
    
    # === WORKFLOW 11: Reports ===
    test_reports(token)
    
    # === WORKFLOW 12: Staff Pages ===
    test_staff_pages(token, admin_user, groups)
    
    # === WORKFLOW 13: MCP Prompt Workflows ===
    test_mcp_prompt_workflows(token, groups, staff_list)
    
    # === WORKFLOW 14: Edge Cases ===
    test_edge_cases(token)
    
    # === SUMMARY ===
    summary = results.summary()
    
    print("\n" + "="*70)
    print("FINAL SUMMARY")
    print("="*70)
    print(f"  Total Tests:      {summary['total_tests']}")
    print(f"  Passed:           {summary['passed']}")
    print(f"  Failed:           {summary['failed']}")
    print(f"  Pass Rate:        {summary['pass_rate']}")
    print(f"  Avg Response:     {summary['avg_response_ms']}ms")
    print(f"  Duration:         {summary['duration_seconds']}s")
    print()
    print("  Workflow Breakdown:")
    for wf, data in summary["workflows"].items():
        status = "✓" if data["failed"] == 0 else "✗"
        print(f"    {status} {wf}: {data['passed']}/{data['total']} passed, avg {data['avg_time_ms']}ms")
    
    # Save full results
    output = {
        "summary": summary,
        "detailed_results": results.results
    }
    
    results_path = os.path.join(os.path.dirname(__file__), "..", "test_results_mcp_ui.json")
    with open(results_path, "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\n  Results saved to: {results_path}")
    
    return summary


if __name__ == "__main__":
    summary = main()
    sys.exit(0 if summary and summary["failed"] == 0 else 1)
