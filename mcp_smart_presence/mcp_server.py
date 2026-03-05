#!/usr/bin/env python3
"""
Smart Presence MCP Server
JSON-RPC 2.0 compliant Model Context Protocol server.
Exposes the entire Smart Presence application (backend API + frontend metadata)
as MCP tools, resources, and prompts for AI-driven automation.

Usage:
    python mcp_server.py                    # stdio transport (default)
    python mcp_server.py --port 3100        # HTTP/SSE transport
"""

import json
import sys
import os
import logging
import argparse
import socket as _socket
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [MCP] %(message)s")
logger = logging.getLogger("smart-presence-mcp")
logging.getLogger("httpx").setLevel(logging.WARNING)


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
    """Manages JWT tokens for backend API calls."""

    def __init__(self):
        self._token: Optional[str] = None

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
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BACKEND_URL}{API_PREFIX}/login/access-token",
                data={"username": username, "password": password},
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["access_token"]
            return data

    def set_token(self, token: str):
        self._token = token

    def clear(self):
        self._token = None


auth = AuthManager()


# ── Tool Executor ──────────────────────────────────────────────────────────

def _build_tool_lookup() -> dict:
    """Build a name → tool definition lookup from the manifest."""
    return {t["name"]: t for t in TOOLS_MANIFEST.get("tools", [])}


TOOL_LOOKUP = _build_tool_lookup()


async def execute_tool(name: str, arguments: dict) -> Any:
    """
    Execute an MCP tool by name. Maps tool definitions to real HTTP calls
    against the backend API.
    """
    tool = TOOL_LOOKUP.get(name)
    if not tool:
        raise ValueError(f"Unknown tool: {name}")

    annotations = tool["annotations"]
    method = annotations["httpMethod"]
    endpoint = annotations["endpoint"]
    content_type = annotations.get("contentType", "application/json")
    requires_auth = annotations.get("auth", True)

    # Handle special auth tool
    if name == "auth_login":
        return await auth.login(arguments["username"], arguments["password"])

    # Resolve path parameters: {param_name} → arguments[param_name]
    url = f"{BACKEND_URL}{endpoint}"
    path_params = []
    import re
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        if content_type == "multipart/form-data":
            # File upload
            files = {}
            form_data = {}
            if "file" in arguments:
                files["file"] = ("image.jpg", arguments["file"], "image/jpeg")
            for k, v in body_params.items():
                form_data[k] = str(v)
            resp = await client.request(
                method,
                url,
                data=form_data,
                files=files,
                headers=auth.multipart_headers if requires_auth else {},
            )
        elif method == "GET":
            resp = await client.get(
                url,
                params=query_params,
                headers=auth.headers if requires_auth else {},
            )
        elif method == "DELETE":
            resp = await client.delete(
                url,
                headers=auth.headers if requires_auth else {},
            )
        else:
            resp = await client.request(
                method,
                url,
                json=body_params if body_params else None,
                headers=auth.headers if requires_auth else {},
            )

        resp.raise_for_status()
        return resp.json()


# ── JSON-RPC 2.0 Handler ──────────────────────────────────────────────────

async def handle_jsonrpc(request: dict) -> dict:
    """Process a single JSON-RPC 2.0 request and return a response."""
    req_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params", {})

    try:
        # ── Lifecycle Methods ──
        if method == "initialize":
            return jsonrpc_result(req_id, {
                "protocolVersion": "2024-11-05",
                "capabilities": SERVER_CONFIG["capabilities"],
                "serverInfo": SERVER_CONFIG["serverInfo"],
            })

        elif method == "initialized":
            # Client acknowledgment — respond per MCP spec
            return jsonrpc_result(req_id, {})

        elif method == "ping":
            return jsonrpc_result(req_id, {})

        # ── Tool Methods ──
        elif method == "tools/list":
            cursor = params.get("cursor")
            tools = TOOLS_MANIFEST.get("tools", [])
            formatted = []
            for t in tools:
                formatted.append({
                    "name": t["name"],
                    "description": t["description"],
                    "inputSchema": t["inputSchema"],
                    "annotations": t.get("annotations", {}),
                })
            return jsonrpc_result(req_id, {"tools": formatted})

        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            result = await execute_tool(tool_name, tool_args)
            return jsonrpc_result(req_id, {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, default=str, indent=2),
                    }
                ],
                "isError": False,
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
                        "contents": [
                            {
                                "uri": r["uri"],
                                "mimeType": r.get("mimeType", "application/json"),
                                "text": json.dumps(r["contents"], indent=2),
                            }
                        ]
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
                    # Build a descriptive message for the prompt
                    steps_desc = "\n".join(
                        f"  Step {s['step']}: {s['tool']} — {s['description']}"
                        for s in p.get("toolSequence", [])
                    )
                    return jsonrpc_result(req_id, {
                        "description": p["description"],
                        "messages": [
                            {
                                "role": "user",
                                "content": {
                                    "type": "text",
                                    "text": f"Execute workflow: {p['name']}\n\n"
                                            f"Description: {p['description']}\n\n"
                                            f"Arguments: {json.dumps(prompt_args)}\n\n"
                                            f"Tool Sequence:\n{steps_desc}",
                                },
                            }
                        ],
                    })
            return jsonrpc_error(req_id, -32602, f"Prompt not found: {prompt_name}")

        # ── Logging ──
        elif method == "logging/setLevel":
            level = params.get("level", "info").upper()
            logging.getLogger().setLevel(getattr(logging, level, logging.INFO))
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
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "error": True,
                        "status_code": e.response.status_code,
                        "detail": error_body,
                    }, indent=2),
                }
            ],
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
    import asyncio
    import threading

    logger.info("Smart Presence MCP Server started (stdio transport)")
    logger.info(f"Backend URL: {BACKEND_URL}")
    logger.info(f"Tools: {len(TOOLS_MANIFEST.get('tools', []))}")
    logger.info(f"Resources: {len(RESOURCES_MANIFEST.get('resources', []))}")
    logger.info(f"Prompts: {len(PROMPTS_MANIFEST.get('prompts', []))}")

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
                # Read until empty line
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

    while True:
        # Read from stdin in a thread to avoid blocking the event loop
        request = await loop.run_in_executor(None, _read_message)
        if request is None:
            break

        logger.info(f"← {request.get('method', 'unknown')}")

        response = await handle_jsonrpc(request)
        if response is None:
            continue

        _write_message(response)
        logger.info(f"→ response (id={response.get('id')})")


# ── Entry Point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Smart Presence MCP Server")
    parser.add_argument("--port", type=int, default=None, help="HTTP port for SSE transport (default: stdio)")
    parser.add_argument("--backend-url", type=str, default=None, help="Backend API URL override")
    args = parser.parse_args()

    if args.backend_url:
        global BACKEND_URL
        BACKEND_URL = args.backend_url

    import asyncio
    asyncio.run(run_stdio())


if __name__ == "__main__":
    main()
