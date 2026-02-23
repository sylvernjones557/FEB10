# Smart Presence — Full Project Setup Guide

> Complete instructions to get both the **Backend** (FastAPI + Supabase PostgreSQL + InsightFace) and the **Frontend** (Vite + React + TypeScript) running on a Windows development machine.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure Overview](#2-project-structure-overview)
3. [Backend Setup](#3-backend-setup)
   - [3.1 Environment Variables](#31-environment-variables)
   - [3.2 Python Virtual Environment](#32-python-virtual-environment)
   - [3.3 Install Dependencies](#33-install-dependencies)
   - [3.4 Create Database Tables](#34-create-database-tables)
   - [3.5 Seed / Initialize Data](#35-seed--initialize-data)
   - [3.6 Start the Backend Server](#36-start-the-backend-server)
   - [3.7 Verify the Backend](#37-verify-the-backend)
4. [Frontend Setup](#4-frontend-setup)
   - [4.1 Install Dependencies](#41-install-dependencies)
   - [4.2 Start the Dev Server](#42-start-the-dev-server)
   - [4.3 Production Build](#43-production-build)
5. [Running Both Together (Quick-Start)](#5-running-both-together-quick-start)
6. [Default Credentials](#6-default-credentials)
7. [API Reference (Quick Links)](#7-api-reference-quick-links)
8. [Utility Scripts](#8-utility-scripts)
9. [GPU Acceleration (Optional)](#9-gpu-acceleration-optional)
10. [Running Tests](#10-running-tests)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum Version | Download |
|------|-----------------|----------|
| **Python** | 3.11+ | https://www.python.org/downloads/ |
| **Node.js** | 18+ | https://nodejs.org/ |
| **npm** | 9+ (ships with Node) | — |
| **Git** | Any recent | https://git-scm.com/ |
| **Supabase Project** | — | https://supabase.com/ (free tier works) |

> **Windows Users:** Make sure Python and Node are added to your system `PATH` during installation.

---

## 2. Project Structure Overview

```
FEB10/
├── backend_smart_presence/       # FastAPI backend
│   ├── app/                      # Main application package
│   │   ├── api/v1/endpoints/     # Route handlers (auth, students, recognition, etc.)
│   │   ├── core/                 # Config, security, face engine
│   │   ├── db/                   # Database session, vector store
│   │   ├── models/               # SQLAlchemy ORM models
│   │   └── schemas/              # Pydantic request/response schemas
│   ├── scripts/                  # DB setup & seed scripts
│   ├── tests/                    # Pytest test suite
│   ├── chroma_store/             # ChromaDB local vector storage (face embeddings ONLY)
│   ├── simple_backend.py         # Standalone lightweight backend (no Supabase)
│   ├── .env                      # Environment variables — Supabase credentials (DO NOT COMMIT)
│   ├── .env.example              # Template for .env
│   ├── requirements.txt          # Main pip dependencies
│   ├── requirements_cpu.txt      # Alternative CPU-only dependency set
│   ├── setup_env.bat             # One-click Windows setup script
│   └── run_server.bat            # One-click Windows server start
│
└── frontend_smart_presence/      # Vite + React frontend
    ├── pages/                    # Page components
    ├── components/               # Reusable UI components
    ├── services/api.ts           # Axios API client (points to backend)
    ├── App.tsx                   # App entry / routing
    ├── package.json              # npm config
    └── vite.config.ts            # Vite dev server config (port 3000)
```

---

## 3. Backend Setup

All commands below should be run from the `backend_smart_presence/` directory.

```powershell
cd backend_smart_presence
```

### 3.1 Environment Variables

Copy the example and fill in your Supabase credentials:

```powershell
copy .env.example .env
```

Open `.env` in your editor and set:

```dotenv
# Database Connection (Supabase PostgreSQL)
# Get from: Supabase Dashboard > Project Settings > Database > Connection URI
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase API URL
# Get from: Supabase Dashboard > Project Settings > API > Project URL
SUPABASE_URL=https://[PROJECT-REF].supabase.co

# Supabase Service Role Key (keep secret!)
# Get from: Supabase Dashboard > Project Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Security
SECRET_KEY=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING
ACCESS_TOKEN_EXPIRE_MINUTES=11520
```

### 3.2 Python Virtual Environment

**Option A — Use the automated script (recommended on Windows):**

```powershell
.\setup_env.bat
```

This creates the `venv`, upgrades pip, and installs all dependencies automatically.

**Option B — Manual setup:**

```powershell
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
```

### 3.3 Install Dependencies

If you used `setup_env.bat`, dependencies are already installed. Otherwise:

```powershell
pip install -r requirements.txt
```

> **Note:** `requirements.txt` uses `onnxruntime` (CPU). See [GPU Acceleration](#9-gpu-acceleration-optional) if you have an NVIDIA GPU.

### 3.4 Create Database Tables

This creates all tables in your Supabase PostgreSQL database:

```powershell
python scripts/create_tables.py
```

### 3.5 Seed / Initialize Data

**Option A — Minimal (admin user only):**

```powershell
python -m app.initial_data
```

Creates a default admin account.

**Option B — Full seed (admin + sample staff + sample students):**

```powershell
python scripts/seed_db.py
```

Creates admin, a staff user, and sample student records.

### 3.6 Start the Backend Server

**Option A — Use the batch file:**

```powershell
.\run_server.bat
```

**Option B — Manual:**

```powershell
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will start at: **http://127.0.0.1:8000**

### 3.7 Verify the Backend

| Check | URL |
|-------|-----|
| Root health check | http://127.0.0.1:8000/ |
| Swagger UI (interactive docs) | http://127.0.0.1:8000/api/v1/docs |
| ReDoc (alternative docs) | http://127.0.0.1:8000/api/v1/redoc |
| OpenAPI JSON | http://127.0.0.1:8000/api/v1/openapi.json |

You can also run the verification script:

```powershell
python scripts/verify_backend.py
```

---

## 4. Frontend Setup

All commands below should be run from the `frontend_smart_presence/` directory.

```powershell
cd frontend_smart_presence
```

### 4.1 Install Dependencies

```powershell
npm install
```

### 4.2 Start the Dev Server

```powershell
npm run dev
```

The frontend will start at: **http://localhost:3000**

> The frontend API client (`services/api.ts`) is pre-configured to call the backend at `http://127.0.0.1:8000/api/v1`. No proxy setup is needed — CORS is enabled on the backend.

### 4.3 Production Build

```powershell
npm run build
npm run preview
```

---

## 5. Running Both Together (Quick-Start)

Open **two separate terminals** and run:

**Terminal 1 — Backend:**

```powershell
cd backend_smart_presence
.\run_server.bat
```

**Terminal 2 — Frontend:**

```powershell
cd frontend_smart_presence
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## 6. Default Credentials

| Account | Username / Staff Code | Password | Role |
|---------|-----------------------|----------|------|
| Admin (default) | `admin` | `admin` | ADMIN |
| Staff (from `mock_data.py`) | `stf-1` through `stf-7` | `password123` | STAFF |

> Change the admin password after first login in any real deployment.

---

## 7. API Reference (Quick Links)

All endpoints are prefixed with `/api/v1`.

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Auth** | POST | `/login/access-token` | Get JWT token (form-encoded `username` + `password`) |
| **Users** | GET | `/users/me` | Current logged-in user profile |
| **Users** | GET | `/users/` | List all staff |
| **Users** | POST | `/users/` | Create a new staff member (admin only) |
| **Students** | GET | `/students/` | List all students |
| **Students** | POST | `/students/` | Register a new student |
| **Students** | DELETE | `/students/{id}` | Remove student + face data |
| **Recognition** | POST | `/recognition/register-face` | Upload image to register face embedding |
| **Recognition** | POST | `/recognition/recognize` | Upload image to identify a student |
| **Classes** | GET | `/classes/` | List all classes |
| **Classes** | GET | `/classes/live` | Currently active classes |
| **Attendance** | GET | `/attendance/history/weekly/{staff_id}` | Weekly attendance history |
| **Timetables** | GET | `/timetables/` | Query timetable entries |
| **Stats** | GET | `/stats/institutional` | Dashboard statistics |

Full interactive docs available at **http://127.0.0.1:8000/api/v1/docs** when the server is running.

---

## 8. Utility Scripts

Run these from the `backend_smart_presence/` directory with the venv activated.

| Script | Command | Purpose |
|--------|---------|---------|
| Create Tables | `python scripts/create_tables.py` | Create all DB tables |
| Seed Database | `python scripts/seed_db.py` | Populate with sample data |
| Reset Database | `python scripts/reset_db.py` | Drop & recreate all tables |
| Reset Admin | `python scripts/reset_admin.py` | Reset admin password |
| Check DB Connection | `python scripts/check_db_connection.py` | Test Supabase connectivity |
| Verify Backend | `python scripts/verify_backend.py` | Health-check the running server |

---

## 9. GPU Acceleration (Optional)

If you have an **NVIDIA GPU with CUDA 11.x**:

```powershell
pip uninstall onnxruntime
pip install onnxruntime-gpu
```

This accelerates InsightFace inference significantly. No code changes are required.

---

## 10. Running Tests

```powershell
cd backend_smart_presence
.\venv\Scripts\activate
pytest
```

Tests are in the `tests/` directory and include:
- API flow tests
- Attendance tests
- Face recognition engine tests
- Health endpoint tests
- Student CRUD tests

---

## 11. Troubleshooting

### Backend won't start

| Issue | Fix |
|-------|-----|
| `ModuleNotFoundError` | Make sure the venv is activated: `.\venv\Scripts\activate` |
| `.env` validation error | Ensure all required vars (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are set in `.env` |
| Port 8000 already in use | Kill the process: `netstat -ano \| findstr :8000` then `taskkill /PID <pid> /F` |
| `psycopg2` install fails | Install build tools: `pip install psycopg2-binary` instead |
| SSL connection error | Ensure `connect_args={"sslmode": "require"}` is set in `app/db/session.py` |

### Frontend won't start

| Issue | Fix |
|-------|-----|
| `npm install` fails | Delete `node_modules` and `package-lock.json`, then retry |
| Port 3000 already in use | Change port in `vite.config.ts` under `server.port` |
| API calls fail (CORS / network) | Make sure the backend is running on port 8000 first |

### Face Recognition issues

| Issue | Fix |
|-------|-----|
| Model download fails | InsightFace downloads models on first run — ensure internet access |
| Low accuracy | Adjust `FACE_MATCH_THRESHOLD` in `app/core/config.py` (default: `0.5`) |
| `onnxruntime` crashes | Ensure `numpy<2.0.0` is installed (required for compatibility) |

### Simple Backend (No Supabase)

If you don't have a Supabase project and want to test face recognition only, use the standalone backend:

```powershell
cd backend_smart_presence
.\venv\Scripts\activate
python simple_backend.py
```

This runs a self-contained FastAPI server with local ChromaDB storage and no external database dependency. A test UI is available at `simple_ui.html`.

---

*Last updated: February 2026*
