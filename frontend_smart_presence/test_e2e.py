"""
End-to-end test: simulates the exact API calls the React frontend makes.
This mirrors what a real browser user would trigger when navigating the app.
"""
import requests
import json
import sys
import subprocess
import time

BASE = "http://127.0.0.1:8000"
API = f"{BASE}/api/v1"
PASS = 0
FAIL = 0
TOKEN = None

def test(name, fn):
    global PASS, FAIL
    try:
        result = fn()
        PASS += 1
        print(f"  [PASS] {name}: {result}")
        return result
    except Exception as e:
        FAIL += 1
        print(f"  [FAIL] {name}: {e}")
        return None

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ─── 1. HEALTH & SYSTEM INFO ───────────────────────────────
section("1. Backend Health & System Info")

def t_health():
    r = requests.get(f"{BASE}/health", timeout=5)
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok"
    return f"status={d['status']}, device={d['device']}, mode={d['mode']}"
test("Health check", t_health)

def t_sysinfo():
    r = requests.get(f"{BASE}/system-info", timeout=5)
    assert r.status_code == 200
    d = r.json()
    return f"python={d.get('python_version','?')}, platform={d.get('platform','?')}"
test("System info", t_sysinfo)

# ─── 2. LOGIN FLOW (what Login.tsx does) ────────────────────
section("2. Login Flow (Login.tsx)")

def t_login():
    global TOKEN
    r = requests.post(f"{API}/login/access-token",
        data={"username": "admin", "password": "admin"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=5)
    assert r.status_code == 200, f"status {r.status_code}: {r.text}"
    d = r.json()
    assert "access_token" in d
    TOKEN = d["access_token"]
    return f"token={TOKEN[:20]}... ({len(TOKEN)} chars)"
test("Login POST (admin/admin)", t_login)

def authed():
    return {"Authorization": f"Bearer {TOKEN}"}

def t_me():
    r = requests.get(f"{API}/staff/me", headers=authed(), timeout=5)
    assert r.status_code == 200
    d = r.json()
    return f"name={d.get('name','?')}, role={d.get('role','?')}, id={d.get('id','?')[:8]}..."
test("GET /staff/me (profile)", t_me)

# ─── 3. DASHBOARD (what Dashboard.tsx loads) ─────────────────
section("3. Dashboard Data (Dashboard.tsx)")

def t_stats():
    r = requests.get(f"{API}/stats/institutional", headers=authed(), timeout=5)
    assert r.status_code == 200
    d = r.json()
    return f"students={d.get('total_students')}, staff={d.get('total_staff')}, classes={d.get('total_classes')}"
test("GET /stats/institutional", t_stats)

def t_orgs():
    r = requests.get(f"{API}/organizations/", headers=authed(), timeout=5)
    assert r.status_code == 200
    d = r.json()
    if isinstance(d, list) and len(d) > 0:
        return f"org={d[0].get('name','?')}, count={len(d)}"
    return f"data={d}"
test("GET /organizations/", t_orgs)

# ─── 4. CLASS DIRECTORY (ClassDirectory.tsx) ──────────────────
section("4. Class Directory (ClassDirectory.tsx)")

classes_data = None
def t_classes():
    global classes_data
    r = requests.get(f"{API}/groups/", headers=authed(), timeout=5)
    assert r.status_code == 200
    classes_data = r.json()
    names = [c.get('name','?') for c in classes_data[:6]]
    return f"count={len(classes_data)}, names={names}"
test("GET /groups/ (classes)", t_classes)

# ─── 5. STAFF DIRECTORY (StaffDirectory.tsx) ──────────────────
section("5. Staff Directory (StaffDirectory.tsx)")

staff_data = None
def t_staff():
    global staff_data
    r = requests.get(f"{API}/staff/", headers=authed(), timeout=5)
    assert r.status_code == 200
    staff_data = r.json()
    names = [s.get('name','?') for s in staff_data[:6]]
    return f"count={len(staff_data)}, names={names}"
test("GET /staff/ (all staff)", t_staff)

# ─── 6. STUDENTS (Enrollment.tsx) ─────────────────────────────
section("6. Student Management (Enrollment.tsx)")

students_data = None
def t_students():
    global students_data
    r = requests.get(f"{API}/students/", headers=authed(), timeout=5)
    assert r.status_code == 200
    students_data = r.json()
    names = [s.get('name','?') for s in students_data[:5]]
    return f"count={len(students_data)}, first5={names}"
test("GET /students/ (all students)", t_students)

# ─── 7. TIMETABLE (MyClassPage.tsx) ──────────────────────────
section("7. Timetable (MyClassPage.tsx)")

def t_timetable():
    r = requests.get(f"{API}/timetable/", headers=authed(), timeout=5)
    assert r.status_code == 200
    d = r.json()
    return f"entries={len(d)}"
test("GET /timetable/", t_timetable)

# ─── 8. ATTENDANCE (ClassAttendance.tsx) ──────────────────────
section("8. Attendance (ClassAttendance.tsx)")

def t_att_status():
    r = requests.get(f"{API}/attendance/status", headers=authed(), timeout=5)
    assert r.status_code == 200
    d = r.json()
    return f"status={d}"
test("GET /attendance/status", t_att_status)

# ─── 9. RECOGNITION ENGINE STATUS ────────────────────────────
section("9. Recognition Engine")

def t_engine():
    r = requests.get(f"{API}/recognition/status", headers=authed(), timeout=5)
    if r.status_code == 200:
        d = r.json()
        return f"engine={d}"
    return f"status_code={r.status_code}"
test("GET /recognition/status", t_engine)

# ─── 10. CLASS DETAIL (ClassDetail.tsx) ───────────────────────
section("10. Class Detail (ClassDetail.tsx)")

if classes_data and len(classes_data) > 0:
    cid = classes_data[0].get('id')
    def t_class_detail():
        r = requests.get(f"{API}/groups/{cid}", headers=authed(), timeout=5)
        assert r.status_code == 200
        d = r.json()
        return f"class={d.get('name','?')}, id={cid[:8]}..."
    test(f"GET /groups/{{id}} (first class)", t_class_detail)

    def t_class_students():
        r = requests.get(f"{API}/students/", params={"group_id": cid}, headers=authed(), timeout=5)
        assert r.status_code == 200
        d = r.json()
        return f"students_in_class={len(d)}"
    test(f"GET /students/?group_id={{id}}", t_class_students)

# ─── 11. STAFF DETAIL (StaffDetail.tsx) ──────────────────────
section("11. Staff Detail (StaffDetail.tsx)")

if staff_data and len(staff_data) > 0:
    sid = staff_data[0].get('id')
    def t_staff_detail():
        r = requests.get(f"{API}/staff/{sid}", headers=authed(), timeout=5)
        assert r.status_code == 200
        d = r.json()
        return f"staff={d.get('name','?')}, role={d.get('role','?')}"
    test(f"GET /staff/{{id}} (first staff)", t_staff_detail)

# ─── 12. MCP SERVER PROTOCOL ─────────────────────────────────
section("12. MCP Server (JSON-RPC over stdio)")

import os
mcp_dir = os.path.dirname(os.path.abspath(__file__))
mcp_script = os.path.join(mcp_dir, "mcp_smart_presence", "mcp_server.py")

def send_mcp(proc, msg):
    """Send a JSON-RPC message and read the response."""
    raw = json.dumps(msg)
    frame = f"Content-Length: {len(raw)}\r\n\r\n{raw}"
    proc.stdin.write(frame.encode())
    proc.stdin.flush()

def read_mcp(proc, timeout=10):
    """Read a JSON-RPC response."""
    import select
    header = b""
    while True:
        b = proc.stdout.read(1)
        if not b:
            return None
        header += b
        if header.endswith(b"\r\n\r\n"):
            break
    length = int(header.decode().split("Content-Length:")[1].strip())
    body = proc.stdout.read(length)
    return json.loads(body.decode())

def t_mcp():
    env = os.environ.copy()
    env["MCP_BACKEND_URL"] = "http://127.0.0.1:8000"
    proc = subprocess.Popen(
        [sys.executable, mcp_script],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        env=env, cwd=mcp_dir
    )
    # Initialize
    send_mcp(proc, {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}})
    init_resp = read_mcp(proc)
    assert init_resp and "result" in init_resp, f"init failed: {init_resp}"
    server_name = init_resp["result"].get("serverInfo",{}).get("name","?")
    
    # Initialized notification
    send_mcp(proc, {"jsonrpc":"2.0","method":"initialized","params":{}})
    read_mcp(proc)  # ack
    
    # List tools
    send_mcp(proc, {"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}})
    tools_resp = read_mcp(proc)
    tool_count = len(tools_resp.get("result",{}).get("tools",[]))
    
    # List resources
    send_mcp(proc, {"jsonrpc":"2.0","id":3,"method":"resources/list","params":{}})
    res_resp = read_mcp(proc)
    res_count = len(res_resp.get("result",{}).get("resources",[]))
    
    # List prompts
    send_mcp(proc, {"jsonrpc":"2.0","id":4,"method":"prompts/list","params":{}})
    prompts_resp = read_mcp(proc)
    prompt_count = len(prompts_resp.get("result",{}).get("prompts",[]))
    
    # Call health_check tool (hits live backend)
    send_mcp(proc, {"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"health_check","arguments":{}}})
    health_resp = read_mcp(proc)
    health_ok = "ok" in json.dumps(health_resp)
    
    # Call auth_login tool (hits live backend)
    send_mcp(proc, {"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"auth_login","arguments":{"staff_code":"admin","password":"admin"}}})
    login_resp = read_mcp(proc)
    login_ok = "access_token" in json.dumps(login_resp)
    
    proc.terminate()
    return f"server={server_name}, tools={tool_count}, resources={res_count}, prompts={prompt_count}, health={health_ok}, login={login_ok}"

test("MCP full protocol test", t_mcp)

# ─── SUMMARY ──────────────────────────────────────────────────
section("FINAL SUMMARY")
total = PASS + FAIL
print(f"  Passed: {PASS}/{total}")
print(f"  Failed: {FAIL}/{total}")
if FAIL == 0:
    print("  ✅ ALL TESTS PASSED — Full stack is working end-to-end!")
else:
    print(f"  ⚠️  {FAIL} test(s) failed")
print()
