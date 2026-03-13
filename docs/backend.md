# ⚙️ Smart Presence Backend Guide

The backend is the engine of Smart Presence. It is a high-performance **FastAPI** application that orchestrates the SQLite relational database, the ChromaDB vector database, and the CPU-optimized InsightFace machine learning engine.

## Tech Stack
*   **Framework**: FastAPI (Python 3.10+)
*   **Server**: Uvicorn
*   **Relational DB**: SQLite + SQLAlchemy ORM
*   **Vector DB**: ChromaDB (Local mode)
*   **ML Engine**: InsightFace (buffalo_sc model running via ONNX Runtime)
*   **Security**: Argon2 Hashing, JWT Tokens (pyjwt)

---

## Quick Start Setup

Ensure you have Python 3.10+ installed on your system.

### 1. Create your Virtual Environment
Open a terminal in the `backend_smart_presence` directory:
```powershell
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# Linux / Mac
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Server
The server will automatically generate the SQLite and ChromaDB files on its first run and populate them with standard `admin` and `testclass` credentials.

```bash
# Standard Run
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Fast Run (Recommended for production/field use)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

---

## Authentication Defaults
Upon first launch, the database is seeded with two essential users:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin` | Full system access, staff creation, organization management. |
| **Teacher (Demo)** | `testclass` | `testclass` | Access to the unrestricted "Test Class" for immediate scanning trials. |

---

## Performance Tuning
By default, the backend is heavily optimized to run fast on **consumer CPUs** without needing dedicated graphics cards. 
You can tweak the `.env` file to customize behavior:

```dotenv
# .env
FACE_DET_SIZE_CPU=320      # Lower = faster CPU face detection (Default: 320, Max: 640)
ONNX_NUM_THREADS=2         # Restricts CPU thread usage to prevent full lockups
LAZY_LOAD_ENGINE=True      # Delays loading the ML model until the first scan request
```

## Security
The backend uses HTTPS endpoints internally if configured with certificates, and safely handles CORS headers for the frontend. Under no circumstances does this backend send biometric data to third-party endpoints.
