"""Quick MCP server test — sends initialize, initialized, tools/list over stdio."""
import subprocess, json, sys, time

proc = subprocess.Popen(
    [sys.executable, "mcp_smart_presence/mcp_server.py"],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    cwd=r"E:\FEB10"
)

def send(proc, msg_dict):
    msg = json.dumps(msg_dict)
    header = f"Content-Length: {len(msg)}\r\n\r\n"
    proc.stdin.write(header.encode() + msg.encode())
    proc.stdin.flush()

# 1. initialize
send(proc, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "test-client", "version": "1.0"}
}})

# 2. initialized
send(proc, {"jsonrpc": "2.0", "id": 2, "method": "initialized", "params": {}})

# 3. tools/list
send(proc, {"jsonrpc": "2.0", "id": 3, "method": "tools/list", "params": {}})

# 4. resources/list
send(proc, {"jsonrpc": "2.0", "id": 4, "method": "resources/list", "params": {}})

# 5. prompts/list
send(proc, {"jsonrpc": "2.0", "id": 5, "method": "prompts/list", "params": {}})

# 6. ping
send(proc, {"jsonrpc": "2.0", "id": 6, "method": "ping", "params": {}})

# 7. Call a real tool: health_check (hits live backend)
send(proc, {"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {
    "name": "health_check", "arguments": {}
}})

# 8. Call system_info tool
send(proc, {"jsonrpc": "2.0", "id": 8, "method": "tools/call", "params": {
    "name": "system_info", "arguments": {}
}})

# 9. Call auth_login tool
send(proc, {"jsonrpc": "2.0", "id": 9, "method": "tools/call", "params": {
    "name": "auth_login", "arguments": {"username": "admin", "password": "admin"}
}})

# 10. Read a resource
send(proc, {"jsonrpc": "2.0", "id": 10, "method": "resources/read", "params": {
    "uri": "smart-presence://backend/models"
}})

time.sleep(3)
proc.stdin.close()
stdout_raw = proc.stdout.read().decode("utf-8", errors="replace")
stderr_raw = proc.stderr.read().decode("utf-8", errors="replace")

# Parse each response separated by Content-Length headers
import re
responses = re.split(r"Content-Length: \d+\r?\n\r?\n", stdout_raw)
for resp_text in responses:
    resp_text = resp_text.strip()
    if not resp_text:
        continue
    try:
        resp = json.loads(resp_text)
        rid = resp.get("id")
        if "error" in resp:
            print(f"  [id={rid}] ERROR: {resp['error']}")
            continue
        result = resp.get("result", {})
        if rid == 1:  # initialize
            si = result.get("serverInfo", {})
            print(f"[1] INITIALIZE: {si.get('name')} v{si.get('version')}")
            print(f"    Protocol: {result.get('protocolVersion')}")
            caps = result.get("capabilities", {})
            print(f"    Capabilities: {list(caps.keys())}")
        elif rid == 2:  # initialized
            print(f"[2] INITIALIZED: OK (response received)")
        elif rid == 3:  # tools/list
            tools = result.get("tools", [])
            print(f"[3] TOOLS: {len(tools)} registered")
            for t in tools[:5]:
                print(f"    - {t['name']}: {t['description'][:60]}")
            if len(tools) > 5:
                print(f"    ... +{len(tools) - 5} more tools")
        elif rid == 4:  # resources/list
            resources = result.get("resources", [])
            print(f"[4] RESOURCES: {len(resources)} registered")
            for r in resources[:3]:
                print(f"    - {r['uri']}: {r['name']}")
            if len(resources) > 3:
                print(f"    ... +{len(resources) - 3} more resources")
        elif rid == 5:  # prompts/list
            prompts = result.get("prompts", [])
            print(f"[5] PROMPTS: {len(prompts)} registered")
            for p in prompts[:3]:
                print(f"    - {p['name']}: {p['description'][:60]}")
            if len(prompts) > 3:
                print(f"    ... +{len(prompts) - 3} more prompts")
        elif rid == 6:  # ping
            print(f"[6] PING: OK")
        elif rid == 7:  # health_check tool call
            content = result.get("content", [])
            is_error = result.get("isError", False)
            text = content[0]["text"] if content else "no content"
            print(f"[7] TOOL health_check: {'ERROR' if is_error else 'OK'}")
            print(f"    {text[:200]}")
        elif rid == 8:  # system_info tool call
            content = result.get("content", [])
            is_error = result.get("isError", False)
            text = content[0]["text"] if content else "no content"
            print(f"[8] TOOL system_info: {'ERROR' if is_error else 'OK'}")
            print(f"    {text[:200]}")
        elif rid == 9:  # auth_login tool call
            content = result.get("content", [])
            is_error = result.get("isError", False)
            text = content[0]["text"] if content else "no content"
            data = json.loads(text) if not is_error else {}
            if "access_token" in data:
                print(f"[9] TOOL auth_login: OK (token received, {len(data['access_token'])} chars)")
            else:
                print(f"[9] TOOL auth_login: {'ERROR' if is_error else 'OK'}")
                print(f"    {text[:200]}")
        elif rid == 10:  # resources/read
            contents = result.get("contents", [])
            if contents:
                print(f"[10] RESOURCE backend/models: OK ({len(contents[0].get('text',''))} chars)")
            else:
                print(f"[10] RESOURCE: empty")
        else:
            print(f"  [id={rid}] {json.dumps(result)[:120]}")
    except json.JSONDecodeError:
        print(f"  [RAW] {resp_text[:120]}")

# Show stderr (MCP logs)
if stderr_raw:
    lines = stderr_raw.strip().split("\n")
    print(f"\n--- MCP Server Logs ({len(lines)} lines) ---")
    for line in lines[:20]:
        print(f"  {line.strip()}")
    if len(lines) > 20:
        print(f"  ... +{len(lines) - 20} more log lines")

proc.wait()
print(f"\nMCP server exit code: {proc.returncode}")
