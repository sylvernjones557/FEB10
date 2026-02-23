# Smart Presence Backend

This is the comprehensive backend for the Smart Presence application, built with **FastAPI**, **SQLAlchemy**, **Supabase**, **ChromaDB**, and **InsightFace**.

## Key Features

1.  **Authentication & Authorization**
    - **JWT-based Auth**: Secure login with access tokens.
    - **Role-Based Access**: Support for STAFF and ADMIN roles.
    - **Password Security**: Uses Argon2 hashing (CPU-friendly and secure).

2.  **Face Recognition System (Auto GPU/CPU)**
    - **Engine**: **InsightFace** with automatic ONNX provider selection.
    - Uses `CUDAExecutionProvider` when NVIDIA/CUDA is available, otherwise falls back to `CPUExecutionProvider` automatically.
    - **Vector Database**: **ChromaDB** (Local persistence) for storing 512-dim face embeddings.
    - **Performance**: Optimized for CPU inference using ONNX Runtime.

3.  **Data Management (V2)**
    - **Database**: **Supabase PostgreSQL** (Cloud) for all relational data (Users, Organizations, Groups, Members, Sessions, Attendance).
    - **Face Embeddings**: **ChromaDB** (Local) — kept local for speed and privacy.
    - **Models**:
        - `User` (staff_profiles): Staff/Admins with login credentials.
        - `Organization`: Single-org default (`org-1`).
        - `Group`: Class/batch/section replacement.
        - `Member`: Any person who can be marked present.
        - `AttendanceSession` / `AttendanceRecord`: Session tracking.

## Technology Stack
- **Python 3.11**
- **FastAPI**: High-performance web framework.
- **SQLAlchemy**: ORM for Supabase PostgreSQL.
- **Supabase**: Cloud PostgreSQL database (all relational data).
- **ChromaDB**: Local vector store for face embeddings only.
- **InsightFace & ONNX**: Face analysis.
- **Argon2**: Password hashing.

## Setup Instructions

1.  **Environment Setup**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```

2.  **Configure `.env`**:
    Copy `.env.example` to `.env` and fill in your Supabase credentials:
    ```dotenv
    DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
    SUPABASE_URL=https://[PROJECT-REF].supabase.co
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    SECRET_KEY=your_secret_key
    ```

3.  **Install Dependencies**:
    ```bash
    setup_env.bat
    ```
    - The setup script installs core dependencies and auto-selects `onnxruntime-gpu` or `onnxruntime` based on machine capability.

4.  **Optional Face Runtime Tuning (`.env`)**:
    ```dotenv
    FACE_DEVICE_PREFERENCE=auto   # auto | gpu | cpu
    FACE_DET_SIZE_CPU=480
    FACE_DET_SIZE_GPU=640
    ```

5.  **Create Tables & Seed Data**:
    ```bash
    python scripts/create_tables.py
    python scripts/seed_db.py
    ```
    - **Default Admin**: `admin` / `admin`

6.  **Run Server**:
    ```bash
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    ```
    - Swagger UI: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

## API Endpoints Overview

### Authentication
- `POST /api/v1/login/access-token`: Get JWT token.

### Users
- `GET /api/v1/users/me`: Current user profile.
- `GET /api/v1/users/`: List all staff.
- `POST /api/v1/users/`: Create staff (admin only).

### Groups
- `GET /api/v1/groups/`: List all groups.
- `POST /api/v1/groups/`: Create a group.
- `GET /api/v1/groups/{group_id}/members`: List members in a group.

### Members
- `GET /api/v1/members/`: List all members.
- `POST /api/v1/members/`: Create a member.
- `DELETE /api/v1/members/{member_id}`: Remove member and their face data.

### Attendance
- `POST /api/v1/attendance/start`: Start scanning session (body: `{ group_id }`).
- `POST /api/v1/attendance/stop`: Stop scanning.
- `POST /api/v1/attendance/finalize`: Finalize and save attendance.
- `GET /api/v1/attendance/history/weekly/{staff_id}`: Weekly history.

### Recognition
- `POST /api/v1/recognition/register-face`: Register face embedding (stored in ChromaDB locally).
- `POST /api/v1/recognition/recognize`: Identify student from image.

### Stats
- `GET /api/v1/stats/institutional`: Dashboard statistics.

## Project Structure
- `app/core`: Config, Security, Face Engine.
- `app/db`: Database session (Supabase PostgreSQL), Vector store (ChromaDB local).
- `app/models`: SQLAlchemy ORM models (PostgreSQL tables).
- `app/schemas`: Pydantic request/response schemas.
- `app/api`: API Routes.
- `chroma_store/`: Local storage for face embeddings only.
- `scripts/`: Database setup, seeding, and maintenance utilities.
