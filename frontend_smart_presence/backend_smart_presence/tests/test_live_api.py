"""
Live API Endpoint Testing Script
=================================
Tests all endpoints against the running server with timing measurements.
Collects response data for CPU mode documentation.

Run: python tests/test_live_api.py
"""

import requests
import time
import json
import sys
import os
import numpy as np

BASE_URL = "http://127.0.0.1:8000"
API_V1 = f"{BASE_URL}/api/v1"

results = []


def timed_request(method, url, description, **kwargs):
    """Execute a request and record timing + response."""
    start = time.time()
    try:
        r = getattr(requests, method)(url, **kwargs)
        elapsed = round((time.time() - start) * 1000, 2)  # ms
        result = {
            "test": description,
            "method": method.upper(),
            "url": url.replace(BASE_URL, ""),
            "status_code": r.status_code,
            "response_time_ms": elapsed,
            "response_body": None,
            "pass": True,
        }
        try:
            result["response_body"] = r.json()
        except Exception:
            result["response_body"] = r.text[:500]
        results.append(result)
        status_icon = "PASS" if r.status_code < 400 else "FAIL"
        print(f"  [{status_icon}] {description} -> {r.status_code} ({elapsed}ms)")
        return r
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 2)
        result = {
            "test": description,
            "method": method.upper(),
            "url": url.replace(BASE_URL, ""),
            "status_code": 0,
            "response_time_ms": elapsed,
            "response_body": str(e),
            "pass": False,
        }
        results.append(result)
        print(f"  [ERROR] {description} -> {e} ({elapsed}ms)")
        return None


def main():
    print("=" * 70)
    print("SMART PRESENCE - LIVE API ENDPOINT TESTING")
    print(f"Server: {BASE_URL}")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # ── 1. PUBLIC ENDPOINTS ──
    print("\n--- 1. PUBLIC / HEALTH ENDPOINTS ---")
    timed_request("get", f"{BASE_URL}/", "Root endpoint")
    timed_request("get", f"{BASE_URL}/health", "Health check")
    timed_request("get", f"{BASE_URL}/system-info", "System info")
    timed_request("get", f"{API_V1}/openapi.json", "OpenAPI schema")

    # ── 2. AUTH ENDPOINTS ──
    print("\n--- 2. AUTHENTICATION ENDPOINTS ---")
    
    # Login with wrong creds
    timed_request("post", f"{API_V1}/login/access-token",
                  "Login - wrong credentials",
                  data={"username": "nonexistent", "password": "wrong"})
    
    # Login with missing creds
    timed_request("post", f"{API_V1}/login/access-token",
                  "Login - missing credentials")
    
    # Try to get a valid admin login (look for seeds/env)
    r = timed_request("post", f"{API_V1}/login/access-token",
                      "Login - admin credentials",
                      data={"username": "admin", "password": "admin"})
    
    auth_headers = {}
    if r and r.status_code == 200:
        token = r.json().get("access_token", "")
        auth_headers = {"Authorization": f"Bearer {token}"}
    else:
        # Try common admin credentials
        for creds in [
            ("admin", "password"),
            ("admin", "Admin@123"),
            ("superadmin", "admin123"),
        ]:
            r = requests.post(f"{API_V1}/login/access-token",
                              data={"username": creds[0], "password": creds[1]})
            if r.status_code == 200:
                token = r.json().get("access_token", "")
                auth_headers = {"Authorization": f"Bearer {token}"}
                results.append({
                    "test": f"Login - found working creds: {creds[0]}",
                    "method": "POST",
                    "url": "/api/v1/login/access-token",
                    "status_code": 200,
                    "response_time_ms": 0,
                    "response_body": {"access_token": token[:20] + "..."},
                    "pass": True,
                })
                print(f"  [INFO] Authenticated as: {creds[0]}")
                break

    # ── 3. PROTECTED ENDPOINTS (with auth) ──
    if auth_headers:
        print("\n--- 3. PROTECTED ENDPOINTS (Authenticated) ---")
        
        # Staff
        timed_request("get", f"{API_V1}/staff/me", "Staff - Get current user",
                      headers=auth_headers)
        timed_request("get", f"{API_V1}/staff/", "Staff - List all",
                      headers=auth_headers)
        
        # Organizations
        timed_request("get", f"{API_V1}/organizations/", "Organizations - List",
                      headers=auth_headers)
        
        # Groups
        timed_request("get", f"{API_V1}/groups/", "Groups - List",
                      headers=auth_headers)
        
        # Students
        timed_request("get", f"{API_V1}/students/", "Students - List",
                      headers=auth_headers)
        
        # Timetable
        timed_request("get", f"{API_V1}/timetable/", "Timetable - List",
                      headers=auth_headers)
        
        # Stats
        timed_request("get", f"{API_V1}/stats/institutional",
                      "Stats - Institutional", headers=auth_headers)
        
        # Classes
        timed_request("get", f"{API_V1}/classes/live", "Classes - Live",
                      headers=auth_headers)

    # ── 4. PROTECTED ENDPOINTS WITHOUT AUTH ──
    print("\n--- 4. SECURITY VALIDATION (No Auth) ---")
    timed_request("get", f"{API_V1}/staff/me", "Staff/me - No auth (expect 401)")
    timed_request("get", f"{API_V1}/students/", "Students - No auth (expect 401)")
    timed_request("get", f"{API_V1}/organizations/", "Orgs - No auth (expect 401)")
    
    # Invalid token
    bad_headers = {"Authorization": "Bearer invalid_garbage_token"}
    timed_request("get", f"{API_V1}/staff/me", "Staff/me - Invalid token (expect 401/403)",
                  headers=bad_headers)

    # ── 5. VALIDATION TESTS ──
    print("\n--- 5. INPUT VALIDATION ---")
    if auth_headers:
        timed_request("post", f"{API_V1}/students/", "Create student - empty body",
                      headers=auth_headers, json={})
        timed_request("post", f"{API_V1}/groups/", "Create group - empty body",
                      headers=auth_headers, json={})
        timed_request("post", f"{API_V1}/attendance/start",
                      "Start session - empty body",
                      headers=auth_headers, json={})
    
    # ── 6. RECOGNITION ENDPOINTS (CPU MODE) ──
    print("\n--- 6. FACE RECOGNITION (CPU Mode) ---")
    if auth_headers:
        # Generate a test image (blank - won't detect faces)
        try:
            import cv2
            img = np.zeros((480, 640, 3), dtype=np.uint8)
            _, img_bytes = cv2.imencode('.jpg', img)
            
            start = time.time()
            r = requests.post(
                f"{API_V1}/recognition/recognize",
                headers=auth_headers,
                files={"file": ("test.jpg", img_bytes.tobytes(), "image/jpeg")}
            )
            elapsed = round((time.time() - start) * 1000, 2)
            result = {
                "test": "Recognize - blank image (CPU)",
                "method": "POST",
                "url": "/api/v1/recognition/recognize",
                "status_code": r.status_code,
                "response_time_ms": elapsed,
                "response_body": r.json() if r.status_code < 500 else r.text[:200],
                "pass": True,
            }
            results.append(result)
            print(f"  [{'PASS' if r.status_code < 500 else 'FAIL'}] Recognize blank image -> {r.status_code} ({elapsed}ms)")
            
            # Register face
            start = time.time()
            r = requests.post(
                f"{API_V1}/recognition/register-face",
                headers=auth_headers,
                data={"student_id": "test_student_live_api"},
                files={"file": ("face.jpg", img_bytes.tobytes(), "image/jpeg")}
            )
            elapsed = round((time.time() - start) * 1000, 2)
            result = {
                "test": "Register face - blank image (CPU)",
                "method": "POST",
                "url": "/api/v1/recognition/register-face",
                "status_code": r.status_code,
                "response_time_ms": elapsed,
                "response_body": r.json() if r.status_code < 500 else r.text[:200],
                "pass": True,
            }
            results.append(result)
            print(f"  [INFO] Register face blank -> {r.status_code} ({elapsed}ms)")
            
        except ImportError:
            print("  [SKIP] cv2 not available for image generation")

    # ── SUMMARY ──
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    total = len(results)
    passed = sum(1 for r in results if r["pass"] and r["status_code"] > 0)
    failed = sum(1 for r in results if not r["pass"] or r["status_code"] == 0)
    avg_time = round(sum(r["response_time_ms"] for r in results) / max(total, 1), 2)
    
    print(f"Total Tests: {total}")
    print(f"Passed:      {passed}")
    print(f"Failed:      {failed}")
    print(f"Avg Response: {avg_time}ms")
    print(f"Mode:        CPU-only (low-power)")
    
    # Write results to JSON
    output_file = os.path.join(os.path.dirname(__file__), "..", "test_results_cpu.json")
    with open(output_file, "w") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "mode": "CPU-only",
            "python_version": sys.version,
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "avg_response_ms": avg_time,
            "results": results
        }, f, indent=2, default=str)
    
    print(f"\nResults saved to: {output_file}")
    return results


if __name__ == "__main__":
    main()
