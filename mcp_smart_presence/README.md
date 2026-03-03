# Smart Presence MCP Server

JSON-RPC 2.0 compliant **Model Context Protocol** server that exposes the entire Smart Presence application for AI-driven automation.

## Architecture

```
mcp_smart_presence/
├── mcp_server.py        # Main server (stdio transport, JSON-RPC 2.0)
├── server_config.json   # Server metadata, capabilities, environment info
├── tools.json           # 42 tools mapping to all backend API endpoints
├── resources.json       # Frontend pages, components, DB models, config
├── prompts.json         # 8 pre-built automation workflows
└── requirements.txt     # Python dependencies (httpx)
```

## Quick Start

```bash
# 1. Install dependency
pip install httpx

# 2. Ensure backend is running
cd backend_smart_presence && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. Run MCP server (stdio)
python mcp_smart_presence/mcp_server.py
```

## VS Code Integration

Already configured in `.vscode/mcp.json`. The server appears as `smart-presence` in VS Code's MCP panel.

## What's Exposed

### Tools (42 total)
Every backend API endpoint as an invocable tool:

| Category | Tools | Description |
|---|---|---|
| **system** | `health_check`, `system_info`, `server_root` | Health & config |
| **auth** | `auth_login` | JWT authentication |
| **organizations** | `organization_list`, `organization_create`, `organization_get` | Org management |
| **groups** | `group_list`, `group_create`, `group_get`, `group_update`, `group_delete`, `group_students`, `group_timetable` | Class/group CRUD |
| **staff** | `staff_list`, `staff_create`, `staff_me`, `staff_get`, `staff_update`, `staff_delete` | Staff management |
| **students** | `student_list`, `student_create`, `student_get`, `student_update`, `student_delete` | Student CRUD |
| **timetable** | `timetable_list`, `timetable_create`, `timetable_get`, `timetable_update`, `timetable_delete` | Schedule management |
| **attendance** | `attendance_start_session`, `attendance_status`, `attendance_stop`, `attendance_verify`, `attendance_finalize`, `attendance_weekly_history` | AI attendance flow |
| **recognition** | `recognition_register_face`, `recognition_recognize`, `recognition_clear_faces` | Face AI |
| **stats** | `stats_institutional` | Dashboard analytics |
| **classes** | `classes_live`, `classes_schedule_today` | Live class info |

### Resources (5)
| URI | Contents |
|---|---|
| `smart-presence://frontend/pages` | 16 pages with routes, props, state, API calls |
| `smart-presence://frontend/components` | 3 shared components (FaceScanner, Layout, Toast) |
| `smart-presence://backend/models` | 7 database models with all columns |
| `smart-presence://backend/config` | 14 backend env variables |
| `smart-presence://frontend/config` | Frontend build config |

### Prompts (8 workflows)
| Prompt | Steps | Description |
|---|---|---|
| `enroll_student` | 4 | Create student + 3-angle face registration |
| `take_attendance` | 5 | Full AI attendance session flow |
| `onboard_teacher` | 2+ | Create staff + assign timetable |
| `dashboard_overview` | 5 | Parallel fetch all dashboard data |
| `class_schedule_lookup` | 1 | Get today's schedule for a class |
| `weekly_report` | 2 | Staff attendance history report |
| `system_health_check` | 3 | Full system health verification |
| `bulk_student_enrollment` | 1+ | Batch create students |

## JSON-RPC 2.0 Methods

| Method | Description |
|---|---|
| `initialize` | Server handshake — returns capabilities & server info |
| `ping` | Health check |
| `tools/list` | List all 42 available tools |
| `tools/call` | Execute a tool by name with arguments |
| `resources/list` | List all 5 resources |
| `resources/read` | Read a resource by URI |
| `prompts/list` | List all 8 workflow prompts |
| `prompts/get` | Get prompt details and tool sequence |
| `logging/setLevel` | Set server log level |

## Authentication Flow

1. Call `tools/call` with `name: "auth_login"` and `arguments: { username, password }`
2. Server stores the JWT token internally
3. All subsequent `tools/call` requests automatically include the Bearer token
4. Token persists for the session lifetime

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MCP_BACKEND_URL` | `http://127.0.0.1:8000` | Backend API base URL |
