# Smart Presence Backend

Backend for the Smart Presence attendance system, built with **FastAPI**, **SQLAlchemy**, **SQLite**, **ChromaDB**, and **InsightFace**.

## Key Features

1.  **Authentication & Authorization**
    - JWT-based auth with access tokens
    - Role-based access (STAFF / ADMIN)
    - Argon2 password hashing

2.  **Face Recognition (CPU-optimized)**
    - **InsightFace** with ONNX Runtime (CPU-only by default)
    - **ChromaDB** (local) for 512-dim face embeddings
    - Model: `buffalo_sc` (smallest, fastest for CPU)

3.  **Data Management**
    - **SQLite** (local file) — no internet or cloud needed
    - Auto-creates tables and seeds demo data on first run
    - Models: Organization, Group, Staff, Student, Timetable, AttendanceSession, AttendanceRecord

## Tech Stack

- Python 3.11, FastAPI, SQLAlchemy, SQLite, ChromaDB, InsightFace, ONNX Runtime

## Setup

1.  **Create virtual environment:**
    ```bash
    python -m venv .venv
    # Windows
    .venv\Scripts\activate
    # macOS / Linux
    source .venv/bin/activate
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure `.env`** (optional — defaults work out of the box):
    ```dotenv
    DATABASE_URL=sqlite:///./db/sqlite/smart_presence.db
    SECRET_KEY=your_secret_key
    FACE_DEVICE_PREFERENCE=cpu
    ```

4.  **Run the server:**
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    Tables and demo data are created automatically on first startup.

    - **Default login:** `admin` / `admin`
    - **Swagger UI:** http://127.0.0.1:8000/api/v1/docs

## API Endpoints

| Area | Endpoint | Description |
|------|----------|-------------|
| Auth | `POST /api/v1/login/access-token` | Get JWT token |
| Users | `GET /api/v1/users/me` | Current user profile |
| Users | `GET /api/v1/users/` | List all staff |
| Groups | `GET /api/v1/groups/` | List all groups |
| Groups | `GET /api/v1/groups/{id}/members` | Members in a group |
| Members | `POST /api/v1/members/` | Create a member |
| Attendance | `POST /api/v1/attendance/start` | Start scanning session |
| Attendance | `POST /api/v1/attendance/stop` | Stop scanning |
| Recognition | `POST /api/v1/recognition/register-face` | Register face |
| Recognition | `POST /api/v1/recognition/recognize` | Identify student |
| Stats | `GET /api/v1/stats/institutional` | Dashboard stats |

## Project Structure

```
backend_smart_presence/
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── core/            # Config, security, face engine
│   ├── db/              # SQLAlchemy session, ChromaDB vector store
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic request/response schemas
│   └── api/             # API route handlers
├── db/                  # Database storage
│   ├── sqlite/          # SQLite database file (auto-created)
│   └── chroma/          # ChromaDB face embeddings (auto-created)
├── scripts/             # DB setup, seeding, health checks
├── tests/               # Pytest test suite
└── requirements.txt     # Python dependencies
```
