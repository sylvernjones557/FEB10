#!/usr/bin/env python3
"""
Smart Presence MCP Server  v3.1
JSON-RPC 2.0 compliant Model Context Protocol server.
Exposes the entire Smart Presence application (backend API + frontend metadata)
as MCP tools, resources, and prompts for AI-driven automation.

Features:
  - Auto-login on startup (with retry / backoff)
  - Backend health probing before tool calls
  - Retry logic with exponential backoff for transient failures
  - Autonomous workflow execution engine (runs prompt toolSequences end-to-end)
  - Direct REST /tools/{name} endpoint for quick testing in HTTP mode
  - Graceful shutdown, CORS, comprehensive logging

Usage:
    python mcp_server.py                    # stdio transport (default)
    python mcp_server.py --port 3100        # HTTP/SSE transport on port 3100
"""

import json
import sys
import os
import re
import logging
import argparse
import asyncio
import socket as _socket
import time as _time
from pathlib import Path
from typing import Any, Optional

import httpx

# ── Force IPv4 for systems without IPv6 ────────────────────────────────────
_orig_getaddrinfo = _socket.getaddrinfo

def _ipv4_first_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    results = _orig_getaddrinfo(host, port, family, type, proto, flags)
    results.sort(key=lambda x: x[0] != _socket.AF_INET)
    return results

_socket.getaddrinfo = _ipv4_first_getaddrinfo

# ── Configuration ──────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
BACKEND_URL = os.getenv("MCP_BACKEND_URL", "http://127.0.0.1:8000")
API_PREFIX = "/api/v1"

# Auto-login credentials (used on startup and when token expires)
AUTO_LOGIN_USER = os.getenv("MCP_AUTO_USER", "admin")
AUTO_LOGIN_PASS = os.getenv("MCP_AUTO_PASS", "admin")

# Retry settings
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 1.0  # seconds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [MCP] %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("smart-presence-mcp")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)


# ── Load Manifests ─────────────────────────────────────────────────────────

def load_json(filename: str) -> dict:
    filepath = Path(__file__).parent / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


SERVER_CONFIG = load_json("server_config.json")
TOOLS_MANIFEST = load_json("tools.json")
RESOURCES_MANIFEST = load_json("resources.json")
PROMPTS_MANIFEST = load_json("prompts.json")


# ── Token Management ───────────────────────────────────────────────────────

class AuthManager:
    """Manages JWT tokens for backend API calls with auto-refresh."""

    def __init__(self):
        self._token: Optional[str] = None
        self._logged_in_as: Optional[str] = None

    @property
    def is_authenticated(self) -> bool:
        return self._token is not None

    @property
    def headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self._token:
            h["Authorization"] = f"Bearer {self._token}"
        return h

    @property
    def multipart_headers(self) -> dict:
        h = {}
        if self._token:
            h["Authorization"] = f"Bearer {self._token}"
        return h

    async def login(self, username: str, password: str) -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{BACKEND_URL}{API_PREFIX}/login/access-token",
                data={"username": username, "password": password},
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["access_token"]
            self._logged_in_as = username
            logger.info(f"✅ Authenticated as '{username}'")
            return data

    async def ensure_authenticated(self):
        """Auto-login if not already authenticated."""
        if self._token:
            return
        await self.login(AUTO_LOGIN_USER, AUTO_LOGIN_PASS)

    async def refresh_on_401(self):
        """Re-authenticate after a 401 response."""
        logger.warning("🔄 Token expired, re-authenticating...")
        self._token = None
        await self.login(AUTO_LOGIN_USER, AUTO_LOGIN_PASS)

    def set_token(self, token: str):
        self._token = token

    def clear(self):
        self._token = None
        self._logged_in_as = None


auth = AuthManager()


# ── Backend Health Probing ─────────────────────────────────────────────────

_backend_healthy = False
_last_health_check = 0.0

async def check_backend_health(force: bool = False) -> bool:
    """Check if the backend API is reachable. Caches result for 30s."""
    global _backend_healthy, _last_health_check
    now = _time.time()
    if not force and (now - _last_health_check) < 30 and _backend_healthy:
        return True
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{BACKEND_URL}/health")
            _backend_healthy = resp.status_code == 200
            _last_health_check = now
            return _backend_healthy
    except Exception:
        _backend_healthy = False
        _last_health_check = now
        return False


# ── Tool Executor ──────────────────────────────────────────────────────────

def _build_tool_lookup() -> dict:
    """Build a name → tool definition lookup from the manifest."""
    return {t["name"]: t for t in TOOLS_MANIFEST.get("tools", [])}


TOOL_LOOKUP = _build_tool_lookup()


async def execute_tool(name: str, arguments: dict) -> Any:
    """
    Execute an MCP tool by name with retry logic.
    Maps tool definitions to real HTTP calls against the backend API.
    Auto-retries on transient failures and 401s.
    """
    tool = TOOL_LOOKUP.get(name)
    if not tool:
        return {"error": True, "message": f"Unknown tool: {name}", "available_tools": sorted(TOOL_LOOKUP.keys())}

    annotations = tool.get("annotations", {})
    method = annotations.get("httpMethod", "GET")
    endpoint = annotations.get("endpoint", "/")
    content_type = annotations.get("contentType", "application/json")
    requires_auth = annotations.get("auth", True)

    # Handle special auth tool
    if name == "auth_login":
        try:
            return await auth.login(arguments.get("username", "admin"), arguments.get("password", "admin"))
        except httpx.HTTPStatusError as e:
            return {"error": True, "status_code": e.response.status_code, "detail": "Invalid credentials"}
        except Exception as e:
            return {"error": True, "detail": str(e)}

    # Ensure authenticated for protected endpoints
    if requires_auth:
        await auth.ensure_authenticated()

    # Check backend health first
    if not await check_backend_health():
        return {
            "error": True,
            "message": "Backend API is not reachable",
            "backend_url": BACKEND_URL,
            "suggestion": "Start the backend with: uvicorn app.main:app --host 0.0.0.0 --port 8000",
        }

    # Resolve path parameters: {param_name} → arguments[param_name]
    url = f"{BACKEND_URL}{endpoint}"
    path_params = []
    for match in re.finditer(r"\{(\w+)\}", endpoint):
        param = match.group(1)
        if param in arguments:
            url = url.replace(f"{{{param}}}", str(arguments[param]))
            path_params.append(param)

    # Separate query params from body params
    query_params = {}
    body_params = {}
    for key, value in arguments.items():
        if key in path_params or key == "file":
            continue
        if method == "GET":
            if value is not None:
                query_params[key] = value
        else:
            body_params[key] = value

    # Retry loop
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if content_type == "multipart/form-data":
                    files = {}
                    form_data = {}
                    if "file" in arguments:
                        file_arg = arguments["file"]
                        if isinstance(file_arg, bytes):
                            files["file"] = ("image.jpg", file_arg, "image/jpeg")
                        elif isinstance(file_arg, str):
                            files["file"] = ("image.jpg", file_arg.encode(), "image/jpeg")
                        else:
                            files["file"] = ("image.jpg", file_arg, "image/jpeg")
                    for k, v in body_params.items():
                        form_data[k] = str(v)
                    resp = await client.request(
                        method, url,
                        data=form_data, files=files,
                        headers=auth.multipart_headers if requires_auth else {},
                    )
                elif method == "GET":
                    resp = await client.get(
                        url, params=query_params,
                        headers=auth.headers if requires_auth else {},
                    )
                elif method == "DELETE":
                    resp = await client.delete(
                        url,
                        headers=auth.headers if requires_auth else {},
                    )
                else:
                    resp = await client.request(
                        method, url,
                        json=body_params if body_params else None,
                        headers=auth.headers if requires_auth else {},
                    )

                # Handle 401 — re-auth and retry
                if resp.status_code == 401 and requires_auth and attempt < MAX_RETRIES:
                    await auth.refresh_on_401()
                    continue

                resp.raise_for_status()

                # Some DELETE endpoints return empty body
                if resp.status_code == 204 or not resp.content:
                    return {"success": True, "message": "Operation completed"}

                return resp.json()

        except httpx.HTTPStatusError as e:
            error_body = e.response.text
            try:
                error_body = e.response.json()
            except Exception:
                pass
            last_error = {
                "error": True,
                "status_code": e.response.status_code,
                "detail": error_body,
                "tool": name,
                "attempt": attempt,
            }
            # Don't retry 4xx client errors (except 401 handled above)
            if 400 <= e.response.status_code < 500:
                return last_error

        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            last_error = {
                "error": True,
                "message": f"Backend connection failed (attempt {attempt}/{MAX_RETRIES})",
                "detail": str(e),
            }
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF_BASE * attempt)

        except Exception as e:
            last_error = {
                "error": True,
                "message": f"Unexpected error (attempt {attempt}/{MAX_RETRIES})",
                "detail": str(e),
                "type": type(e).__name__,
            }
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF_BASE * attempt)

    return last_error or {"error": True, "message": "All retries exhausted"}


# ── Autonomous Workflow Executor ───────────────────────────────────────────

async def execute_workflow(prompt_name: str, prompt_args: dict) -> dict:
    """
    Execute a prompt workflow autonomously — runs all tool calls in sequence,
    passes results between steps, and returns a complete execution report.
    """
    # Find the prompt
    prompt = None
    for p in PROMPTS_MANIFEST.get("prompts", []):
        if p["name"] == prompt_name:
            prompt = p
            break
    if not prompt:
        return {"error": True, "message": f"Workflow not found: {prompt_name}"}

    logger.info(f"🚀 Starting autonomous workflow: {prompt_name}")

    steps = prompt.get("toolSequence", [])
    results = []
    step_outputs = {}
    success_count = 0
    error_count = 0

    for step_def in steps:
        step_num = step_def["step"]
        tool_name = step_def["tool"]
        description = step_def.get("description", "")
        is_repeat = step_def.get("repeat", False)
        is_parallel = step_def.get("parallel", False)

        logger.info(f"  Step {step_num}: {tool_name} — {description}")

        # Build arguments from prompt_args + previous step outputs
        tool_args = dict(prompt_args)

        # For repeat tools, check if there's an array of items to iterate
        if is_repeat:
            # Determine what to iterate based on the tool type
            items_to_process = []
            if tool_name == "student_create" and "students" in prompt_args:
                items_to_process = prompt_args["students"]
            elif tool_name == "timetable_create" and "timetable_entries" in prompt_args:
                items_to_process = prompt_args["timetable_entries"]
            elif tool_name == "recognition_register_face":
                for img_key in ["front_image", "left_image", "right_image"]:
                    if img_key in prompt_args:
                        items_to_process.append({"file": prompt_args[img_key], "student_id": step_outputs.get("student_id", prompt_args.get("student_id", ""))})
            elif tool_name == "recognition_recognize" and "camera_frames" in prompt_args:
                items_to_process = [{"file": frame} for frame in prompt_args["camera_frames"]]

            if items_to_process:
                step_results = []
                for i, item in enumerate(items_to_process):
                    merged_args = {**tool_args, **item}
                    # Remove meta-keys not needed by the tool
                    for meta_key in ["students", "timetable_entries", "camera_frames", "front_image", "left_image", "right_image"]:
                        merged_args.pop(meta_key, None)
                    result = await execute_tool(tool_name, merged_args)
                    step_results.append(result)
                    is_err = isinstance(result, dict) and result.get("error")
                    if is_err:
                        error_count += 1
                    else:
                        success_count += 1
                    logger.info(f"    Iteration {i+1}/{len(items_to_process)}: {'❌' if is_err else '✅'}")

                results.append({
                    "step": step_num,
                    "tool": tool_name,
                    "description": description,
                    "iterations": len(items_to_process),
                    "results": step_results,
                })
                continue

        # Single execution
        # Remove meta-keys not needed by the tool
        for meta_key in ["students", "timetable_entries", "camera_frames", "front_image", "left_image", "right_image", "manual_additions"]:
            tool_args.pop(meta_key, None)

        result = await execute_tool(tool_name, tool_args)
        is_err = isinstance(result, dict) and result.get("error")

        if is_err:
            error_count += 1
        else:
            success_count += 1

        # Capture output values for use in subsequent steps
        if isinstance(result, dict):
            if "id" in result:
                step_outputs["student_id"] = result["id"]
                step_outputs["staff_id"] = result["id"]
            if "session_id" in result:
                step_outputs["session_id"] = result["session_id"]

        results.append({
            "step": step_num,
            "tool": tool_name,
            "description": description,
            "result": result,
            "success": not is_err,
        })

        # Stop workflow on critical error (unless parallel)
        if is_err and not is_parallel:
            detail = result.get("detail", result.get("message", ""))
            # Don't stop for non-critical errors
            if isinstance(detail, dict):
                status = detail.get("status_code", 0) if isinstance(detail, dict) else 0
            else:
                status = result.get("status_code", 0)
            if status >= 500:
                logger.error(f"  ❌ Critical error at step {step_num}, stopping workflow")
                break

    overall_success = error_count == 0
    logger.info(f"{'✅' if overall_success else '⚠️'} Workflow '{prompt_name}' completed: {success_count} ok, {error_count} errors")

    return {
        "workflow": prompt_name,
        "description": prompt.get("description", ""),
        "success": overall_success,
        "summary": {
            "total_steps": len(steps),
            "executed": len(results),
            "success_count": success_count,
            "error_count": error_count,
        },
        "steps": results,
    }


# ── JSON-RPC 2.0 Handler ──────────────────────────────────────────────────

async def handle_jsonrpc(request: dict) -> dict:
    """Process a single JSON-RPC 2.0 request and return a response."""
    req_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params", {})

    try:
        # ── Lifecycle Methods ──
        if method == "initialize":
            # Auto-login on first initialize
            try:
                await auth.ensure_authenticated()
            except Exception as e:
                logger.warning(f"Auto-login failed during initialize: {e}")

            return jsonrpc_result(req_id, {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    **SERVER_CONFIG["capabilities"],
                    "autonomousWorkflows": True,
                },
                "serverInfo": {
                    **SERVER_CONFIG["serverInfo"],
                    "version": "3.1.0",
                },
            })

        elif method == "initialized":
            return jsonrpc_result(req_id, {})

        elif method == "ping":
            backend_ok = await check_backend_health(force=True)
            return jsonrpc_result(req_id, {
                "status": "ok",
                "backend_connected": backend_ok,
                "authenticated": auth.is_authenticated,
            })

        # ── Tool Methods ──
        elif method == "tools/list":
            tools = TOOLS_MANIFEST.get("tools", [])
            formatted = []
            for t in tools:
                formatted.append({
                    "name": t["name"],
                    "description": t["description"],
                    "inputSchema": t["inputSchema"],
                    "annotations": t.get("annotations", {}),
                })
            # Add the autonomous workflow executor as a special tool
            formatted.append({
                "name": "execute_workflow",
                "description": "Execute a named autonomous workflow end-to-end. Runs all tool calls in sequence with result passing between steps.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "workflow_name": {
                            "type": "string",
                            "description": "Name of the workflow/prompt to execute (e.g. 'enroll_student', 'take_attendance', 'system_health_check')",
                        },
                        "arguments": {
                            "type": "object",
                            "description": "Arguments to pass to the workflow",
                        },
                    },
                    "required": ["workflow_name"],
                },
                "annotations": {
                    "category": "autonomous",
                    "readOnly": False,
                    "idempotent": False,
                },
            })
            # Add backend health check tool
            formatted.append({
                "name": "backend_health",
                "description": "Check if the backend API is reachable and responsive. Returns connectivity status.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
                "annotations": {
                    "category": "system",
                    "readOnly": True,
                    "idempotent": True,
                },
            })
            return jsonrpc_result(req_id, {"tools": formatted})

        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})

            # Handle special meta-tools
            if tool_name == "execute_workflow":
                wf_name = tool_args.get("workflow_name", "")
                wf_args = tool_args.get("arguments", {})
                result = await execute_workflow(wf_name, wf_args)
                return jsonrpc_result(req_id, {
                    "content": [{"type": "text", "text": json.dumps(result, default=str, indent=2)}],
                    "isError": not result.get("success", False),
                })

            if tool_name == "backend_health":
                is_healthy = await check_backend_health(force=True)
                result = {
                    "healthy": is_healthy,
                    "backend_url": BACKEND_URL,
                    "authenticated": auth.is_authenticated,
                    "authenticated_as": auth._logged_in_as,
                }
                return jsonrpc_result(req_id, {
                    "content": [{"type": "text", "text": json.dumps(result, indent=2)}],
                    "isError": False,
                })

            # Standard tool call
            result = await execute_tool(tool_name, tool_args)
            is_error = isinstance(result, dict) and result.get("error", False)
            return jsonrpc_result(req_id, {
                "content": [{"type": "text", "text": json.dumps(result, default=str, indent=2)}],
                "isError": is_error,
            })

        # ── Resource Methods ──
        elif method == "resources/list":
            resources = RESOURCES_MANIFEST.get("resources", [])
            formatted = []
            for r in resources:
                formatted.append({
                    "uri": r["uri"],
                    "name": r["name"],
                    "description": r["description"],
                    "mimeType": r.get("mimeType", "application/json"),
                })
            return jsonrpc_result(req_id, {"resources": formatted})

        elif method == "resources/read":
            uri = params.get("uri", "")
            for r in RESOURCES_MANIFEST.get("resources", []):
                if r["uri"] == uri:
                    return jsonrpc_result(req_id, {
                        "contents": [{
                            "uri": r["uri"],
                            "mimeType": r.get("mimeType", "application/json"),
                            "text": json.dumps(r["contents"], indent=2),
                        }]
                    })
            return jsonrpc_error(req_id, -32602, f"Resource not found: {uri}")

        # ── Prompt Methods ──
        elif method == "prompts/list":
            prompts = PROMPTS_MANIFEST.get("prompts", [])
            formatted = []
            for p in prompts:
                formatted.append({
                    "name": p["name"],
                    "description": p["description"],
                    "arguments": p.get("arguments", []),
                })
            return jsonrpc_result(req_id, {"prompts": formatted})

        elif method == "prompts/get":
            prompt_name = params.get("name", "")
            prompt_args = params.get("arguments", {})
            for p in PROMPTS_MANIFEST.get("prompts", []):
                if p["name"] == prompt_name:
                    steps_desc = "\n".join(
                        f"  Step {s['step']}: {s['tool']} — {s['description']}"
                        for s in p.get("toolSequence", [])
                    )
                    return jsonrpc_result(req_id, {
                        "description": p["description"],
                        "messages": [{
                            "role": "user",
                            "content": {
                                "type": "text",
                                "text": (
                                    f"Execute workflow: {p['name']}\n\n"
                                    f"Description: {p['description']}\n\n"
                                    f"Arguments: {json.dumps(prompt_args)}\n\n"
                                    f"Tool Sequence:\n{steps_desc}\n\n"
                                    f"TIP: You can execute this entire workflow autonomously by calling "
                                    f"the 'execute_workflow' tool with workflow_name='{p['name']}' "
                                    f"and the required arguments."
                                ),
                            },
                        }],
                    })
            return jsonrpc_error(req_id, -32602, f"Prompt not found: {prompt_name}")

        # ── Logging ──
        elif method == "logging/setLevel":
            level = params.get("level", "info").upper()
            logging.getLogger().setLevel(getattr(logging, level, logging.INFO))
            return jsonrpc_result(req_id, {})

        # ── Notifications (no response needed) ──
        elif method.startswith("notifications/"):
            return jsonrpc_result(req_id, {})

        else:
            return jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    except httpx.HTTPStatusError as e:
        error_body = e.response.text
        try:
            error_body = e.response.json()
        except Exception:
            pass
        return jsonrpc_result(req_id, {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "error": True,
                    "status_code": e.response.status_code,
                    "detail": error_body,
                }, indent=2),
            }],
            "isError": True,
        })
    except Exception as e:
        logger.exception(f"Error handling {method}")
        return jsonrpc_error(req_id, -32603, str(e))


def jsonrpc_result(req_id: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def jsonrpc_error(req_id: Any, code: int, message: str) -> dict:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


# ── STDIO Transport ────────────────────────────────────────────────────────

async def run_stdio():
    """Run the MCP server over stdin/stdout.
    Uses thread-based blocking reads for Windows compatibility
    (asyncio ProactorEventLoop can't do connect_read_pipe on Windows).
    """
    logger.info("=" * 60)
    logger.info("Smart Presence MCP Server v3.0 (stdio transport)")
    logger.info("=" * 60)
    logger.info(f"Backend URL: {BACKEND_URL}")
    logger.info(f"Tools: {len(TOOLS_MANIFEST.get('tools', []))} + 2 meta-tools")
    logger.info(f"Resources: {len(RESOURCES_MANIFEST.get('resources', []))}")
    logger.info(f"Prompts: {len(PROMPTS_MANIFEST.get('prompts', []))}")
    logger.info(f"Auto-login: {AUTO_LOGIN_USER}")

    # Probe backend health
    healthy = await check_backend_health(force=True)
    if healthy:
        logger.info("✅ Backend is reachable")
        try:
            await auth.ensure_authenticated()
        except Exception as e:
            logger.warning(f"⚠️ Auto-login failed: {e}")
    else:
        logger.warning("⚠️ Backend is NOT reachable — tools will retry when called")

    loop = asyncio.get_event_loop()
    input_stream = sys.stdin.buffer
    output_stream = sys.stdout.buffer

    def _read_message():
        """Read one JSON-RPC message from stdin (blocking). Returns None on EOF."""
        while True:
            header_line = input_stream.readline()
            if not header_line:
                return None
            header = header_line.decode("utf-8").strip()
            if header.startswith("Content-Length:"):
                content_length = int(header.split(":")[1].strip())
                while True:
                    sep = input_stream.readline()
                    if not sep or sep.strip() == b"":
                        break
                body = input_stream.read(content_length)
                if not body:
                    return None
                return json.loads(body.decode("utf-8"))

    def _write_message(response: dict):
        """Write one JSON-RPC response to stdout (blocking)."""
        response_bytes = json.dumps(response).encode("utf-8")
        header = f"Content-Length: {len(response_bytes)}\r\n\r\n"
        output_stream.write(header.encode("utf-8"))
        output_stream.write(response_bytes)
        output_stream.flush()

    logger.info("Ready — waiting for JSON-RPC messages on stdin...")

    while True:
        request = await loop.run_in_executor(None, _read_message)
        if request is None:
            break

        method = request.get('method', 'unknown')
        logger.info(f"← {method}")

        response = await handle_jsonrpc(request)
        if response is None:
            continue

        _write_message(response)
        logger.info(f"→ response (id={response.get('id')})")


# ── HTTP/SSE Transport ────────────────────────────────────────────────────

async def run_http(port: int):
    """Run the MCP server as an HTTP server with SSE, JSON-RPC, and REST endpoints."""
    import uuid as _uuid
    from starlette.applications import Starlette
    from starlette.routing import Route
    from starlette.requests import Request
    from starlette.responses import JSONResponse, HTMLResponse
    from starlette.middleware import Middleware
    from starlette.middleware.cors import CORSMiddleware

    try:
        from sse_starlette.sse import EventSourceResponse
        has_sse = True
    except ImportError:
        has_sse = False
        logger.warning("sse_starlette not installed — SSE transport disabled, using REST-only mode")

    import uvicorn

    # Store SSE connections: session_id → asyncio.Queue
    _sessions: dict[str, asyncio.Queue] = {}

    async def handle_sse(request: Request):
        """SSE endpoint — client connects here to receive server messages."""
        if not has_sse:
            return JSONResponse({"error": "SSE not available — install sse_starlette"}, status_code=501)
        session_id = str(_uuid.uuid4())
        queue: asyncio.Queue = asyncio.Queue()
        _sessions[session_id] = queue
        logger.info(f"SSE client connected: {session_id[:8]}")

        async def event_generator():
            yield {"event": "endpoint", "data": f"/message?session_id={session_id}"}
            try:
                while True:
                    message = await queue.get()
                    yield {"event": "message", "data": json.dumps(message)}
            except asyncio.CancelledError:
                pass
            finally:
                _sessions.pop(session_id, None)
                logger.info(f"SSE client disconnected: {session_id[:8]}")

        return EventSourceResponse(event_generator())

    async def handle_message(request: Request):
        """JSON-RPC message endpoint — client sends requests here."""
        session_id = request.query_params.get("session_id")
        if not session_id or session_id not in _sessions:
            return JSONResponse({"error": "Invalid or missing session_id"}, status_code=400)

        body = await request.json()
        logger.info(f"← {body.get('method', 'unknown')} (session={session_id[:8]})")

        response = await handle_jsonrpc(body)
        if response:
            await _sessions[session_id].put(response)
            logger.info(f"→ response (id={response.get('id')})")

        return JSONResponse({"status": "accepted"})

    async def handle_jsonrpc_direct(request: Request):
        """Direct JSON-RPC endpoint — no SSE required. POST a JSON-RPC request, get a response."""
        body = await request.json()
        logger.info(f"← {body.get('method', 'unknown')} (direct)")
        response = await handle_jsonrpc(body)
        return JSONResponse(response)

    async def handle_tool_direct(request: Request):
        """REST endpoint: POST /tools/{tool_name} with JSON body → execute tool directly."""
        tool_name = request.path_params.get("tool_name", "")
        try:
            body = await request.json()
        except Exception:
            body = {}
        logger.info(f"← REST /tools/{tool_name}")
        result = await execute_tool(tool_name, body)
        is_error = isinstance(result, dict) and result.get("error", False)
        return JSONResponse(result, status_code=400 if is_error else 200)

    async def handle_workflow_direct(request: Request):
        """REST endpoint: POST /workflows/{name} with JSON body → execute workflow autonomously."""
        wf_name = request.path_params.get("workflow_name", "")
        try:
            body = await request.json()
        except Exception:
            body = {}
        logger.info(f"← REST /workflows/{wf_name}")
        result = await execute_workflow(wf_name, body)
        is_error = not result.get("success", False)
        return JSONResponse(result, status_code=400 if is_error else 200)

    async def handle_tools_list_rest(request: Request):
        """REST endpoint: GET /tools → list all available tools."""
        tools = TOOLS_MANIFEST.get("tools", [])
        return JSONResponse({
            "count": len(tools) + 2,
            "tools": [{"name": t["name"], "description": t["description"], "category": t.get("category", "")} for t in tools]
            + [
                {"name": "execute_workflow", "description": "Execute a named autonomous workflow end-to-end", "category": "autonomous"},
                {"name": "backend_health", "description": "Check backend API connectivity", "category": "system"},
            ],
        })

    async def handle_workflows_list_rest(request: Request):
        """REST endpoint: GET /workflows → list all available workflows."""
        prompts = PROMPTS_MANIFEST.get("prompts", [])
        return JSONResponse({
            "count": len(prompts),
            "workflows": [{"name": p["name"], "description": p["description"], "steps": len(p.get("toolSequence", []))} for p in prompts],
        })

    async def handle_home(request: Request):
        """Home page with server info and API docs."""
        tools_count = len(TOOLS_MANIFEST.get("tools", []))
        resources_count = len(RESOURCES_MANIFEST.get("resources", []))
        prompts_count = len(PROMPTS_MANIFEST.get("prompts", []))
        backend_ok = await check_backend_health()
        auth_status = "✅ Authenticated" if auth.is_authenticated else "❌ Not authenticated"
        backend_status = "✅ Connected" if backend_ok else "❌ Unreachable"

        return HTMLResponse(f"""
        <html>
        <head><title>Smart Presence MCP Server v3.0</title>
        <style>
            body {{ font-family: 'Inter', system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0f172a; color: #e2e8f0; }}
            h1 {{ color: #818cf8; font-size: 1.8em; }}
            h2 {{ color: #94a3b8; font-size: 1.1em; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.1em; }}
            .card {{ background: #1e293b; padding: 20px; border-radius: 12px; margin: 16px 0; border: 1px solid #334155; }}
            .stat {{ display: inline-block; margin: 0 24px 0 0; text-align: center; }}
            .stat .num {{ font-size: 2.2em; font-weight: bold; color: #818cf8; }}
            .stat .label {{ color: #94a3b8; font-size: 0.85em; margin-top: 4px; }}
            code {{ background: #334155; padding: 3px 8px; border-radius: 6px; font-size: 0.9em; color: #e2e8f0; }}
            .endpoint {{ margin: 10px 0; padding: 8px 12px; background: #0f172a; border-radius: 8px; }}
            .method {{ font-weight: bold; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-right: 8px; }}
            .get {{ background: #065f46; color: #6ee7b7; }}
            .post {{ background: #7c2d12; color: #fdba74; }}
            .status {{ padding: 4px 12px; border-radius: 20px; font-size: 0.85em; }}
            .ok {{ background: #065f46; color: #6ee7b7; }}
            .err {{ background: #7f1d1d; color: #fca5a5; }}
            a {{ color: #818cf8; text-decoration: none; }}
            a:hover {{ text-decoration: underline; }}
        </style>
        </head>
        <body>
            <h1>🧠 Smart Presence MCP Server</h1>
            <div class="card">
                <p><strong>Version:</strong> 3.1.0 &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Protocol:</strong> MCP 2024-11-05</p>
                <p><strong>Backend:</strong> <a href="{BACKEND_URL}">{BACKEND_URL}</a> <span class="status {'ok' if backend_ok else 'err'}">{backend_status}</span></p>
                <p><strong>Auth:</strong> <span class="status {'ok' if auth.is_authenticated else 'err'}">{auth_status}</span></p>
            </div>
            <div class="card">
                <div class="stat"><div class="num">{tools_count + 2}</div><div class="label">Tools</div></div>
                <div class="stat"><div class="num">{resources_count}</div><div class="label">Resources</div></div>
                <div class="stat"><div class="num">{prompts_count}</div><div class="label">Workflows</div></div>
            </div>

            <h2>MCP Endpoints (JSON-RPC)</h2>
            <div class="card">
                <div class="endpoint"><span class="method get">GET</span> <code>/sse</code> — SSE connection (server-sent events)</div>
                <div class="endpoint"><span class="method post">POST</span> <code>/message?session_id=...</code> — Send JSON-RPC via SSE session</div>
                <div class="endpoint"><span class="method post">POST</span> <code>/jsonrpc</code> — Direct JSON-RPC (no SSE needed)</div>
            </div>

            <h2>REST Endpoints (Direct Access)</h2>
            <div class="card">
                <div class="endpoint"><span class="method get">GET</span> <code>/tools</code> — <a href="/tools">List all tools</a></div>
                <div class="endpoint"><span class="method post">POST</span> <code>/tools/{{tool_name}}</code> — Execute a tool directly</div>
                <div class="endpoint"><span class="method get">GET</span> <code>/workflows</code> — <a href="/workflows">List all workflows</a></div>
                <div class="endpoint"><span class="method post">POST</span> <code>/workflows/{{name}}</code> — Execute a workflow autonomously</div>
                <div class="endpoint"><span class="method get">GET</span> <code>/health</code> — <a href="/health">Health check</a></div>
            </div>
        </body>
        </html>
        """)

    async def handle_health(request: Request):
        """Health check endpoint."""
        backend_ok = await check_backend_health(force=True)
        return JSONResponse({
            "status": "ok",
            "server": SERVER_CONFIG["serverInfo"]["name"],
            "version": "3.1.0",
            "tools": len(TOOLS_MANIFEST.get("tools", [])) + 2,
            "resources": len(RESOURCES_MANIFEST.get("resources", [])),
            "prompts": len(PROMPTS_MANIFEST.get("prompts", [])),
            "backend_url": BACKEND_URL,
            "backend_connected": backend_ok,
            "authenticated": auth.is_authenticated,
            "authenticated_as": auth._logged_in_as,
        })

    routes = [
        Route("/", handle_home),
        Route("/health", handle_health),
        Route("/sse", handle_sse),
        Route("/message", handle_message, methods=["POST"]),
        Route("/jsonrpc", handle_jsonrpc_direct, methods=["POST"]),
        Route("/tools", handle_tools_list_rest),
        Route("/tools/{tool_name}", handle_tool_direct, methods=["POST"]),
        Route("/workflows", handle_workflows_list_rest),
        Route("/workflows/{workflow_name}", handle_workflow_direct, methods=["POST"]),
    ]

    app = Starlette(
        routes=routes,
        middleware=[
            Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]),
        ],
    )

    logger.info("=" * 60)
    logger.info(f"Smart Presence MCP Server v3.1 (HTTP transport)")
    logger.info(f"URL: http://localhost:{port}")
    logger.info("=" * 60)
    logger.info(f"Backend URL: {BACKEND_URL}")
    logger.info(f"Tools: {len(TOOLS_MANIFEST.get('tools', []))} + 2 meta-tools")
    logger.info(f"Resources: {len(RESOURCES_MANIFEST.get('resources', []))}")
    logger.info(f"Prompts/Workflows: {len(PROMPTS_MANIFEST.get('prompts', []))}")

    # Probe backend and auto-login
    healthy = await check_backend_health(force=True)
    if healthy:
        logger.info("✅ Backend is reachable")
        try:
            await auth.ensure_authenticated()
        except Exception as e:
            logger.warning(f"⚠️ Auto-login failed: {e}")
    else:
        logger.warning("⚠️ Backend is NOT reachable — tools will retry when called")

    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


# ── Entry Point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Smart Presence MCP Server v3.1")
    parser.add_argument("--port", type=int, default=None, help="HTTP port for SSE/REST transport (default: stdio)")
    parser.add_argument("--backend-url", type=str, default=None, help="Backend API URL override")
    parser.add_argument("--auto-user", type=str, default=None, help="Auto-login username")
    parser.add_argument("--auto-pass", type=str, default=None, help="Auto-login password")
    args = parser.parse_args()

    if args.backend_url:
        global BACKEND_URL
        BACKEND_URL = args.backend_url

    if args.auto_user:
        global AUTO_LOGIN_USER
        AUTO_LOGIN_USER = args.auto_user
    if args.auto_pass:
        global AUTO_LOGIN_PASS
        AUTO_LOGIN_PASS = args.auto_pass

    if args.port:
        asyncio.run(run_http(args.port))
    else:
        asyncio.run(run_stdio())


if __name__ == "__main__":
    main()
