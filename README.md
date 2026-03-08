# Smart Presence

AI-powered attendance system with face recognition, timetable scheduling, and staff/student management. 

### 🚀 100% Offline & Local-First
This application is designed to run entirely on **Client Hardware**. We have removed all cloud dependencies (Supabase/Cloud Databases) in favor of a robust local stack.

---

## 🏗️ Architecture & Technology

| Layer | Technology | Storage |
|-------|------------|---------|
| **Frontend** | React 19 + Vite | Local Browser Cache |
| **Backend** | FastAPI (Python) | CPU-Only Mode |
| **Database** | **SQLite** | `backend_smart_presence/db/sqlite/` |
| **Vector Store**| **ChromaDB** | `backend_smart_presence/db/chroma/` |
| **AI Engine** | InsightFace + ONNX | Local Model Execution (CPU) |
| **Automation** | MCP Server | Optional AI Gateway |

---

## 📂 Portability & Data Sharing
**Important Note for Developers:**

By default, the local databases (`.db` files and Chroma folders) are listed in `.gitignore`. This is to prevent large, sensitive user data from being committed to GitHub.

*   **Sharing across systems:** If you want to move your attendance data to another computer, you must manually copy the `backend_smart_presence/db/` folder to the target machine.
*   **Fresh Installs:** If you clone this repo on a new system, the backend will automatically initialize a **fresh, empty SQLite database** and run the seed script to create demo data (`admin/admin`).

---

## 🛠️ Installation & Setup

### 1. Backend Setup (CPU-Optimized)
1. Navigate to the backend folder: `cd backend_smart_presence`
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server (Forces CPU-only mode):
   ```bash
   run_server.bat
   ```
   *The server runs on http://127.0.0.1:8000*

### 2. Frontend Setup
1. Navigate to the frontend folder: `cd frontend_smart_presence`
2. Install Node packages: `npm install`
3. Start the dev server: `npm run dev`
   *The frontend runs on https://localhost:3000 (HTTPS required for camera access).*

### 3. MCP Server (AI Interface)
1. Navigate to `mcp_smart_presence`
2. Run `python mcp_server.py`
   *This enables AI assistants to interact with your local data through the Model Context Protocol.*

---

## ⚙️ Configuration (.env)
The system is pre-configured for low-power CPU usage:
- `FACE_DEVICE_PREFERENCE=cpu`: Disables GPU to save power/ram.
- `ONNX_NUM_THREADS=2`: Prevents system thrashing.
- `DATABASE_URL`: Points to the local SQLite file.

---

## 🔒 Security & Privacy
Since data never leaves your machine:
- No biometric data is sent to the cloud.
- Passwords are hashed locally using Argon2.
- JWT tokens are used for session management between the local Frontend and Backend.

---

## 📜 License
Educational use only. Built for local institutional management.
