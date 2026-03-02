# Smart Presence — Fresh Install Guide (College Low-End System)

> One-shot setup for a fresh Windows PC with no dev tools installed.
> Tested on Windows 10/11, Intel i3/i5, 4–8 GB RAM, no GPU required.

---

## Prerequisites to Download

| Software | Version | Download Link |
|----------|---------|---------------|
| **Python** | 3.11.x | https://www.python.org/downloads/release/python-3118/ |
| **Node.js** | 20 LTS | https://nodejs.org/en/download |
| **Git** | Latest | https://git-scm.com/download/win |

> **During Python install:** check ✅ "Add Python to PATH" and ✅ "Install pip".
> **During Node install:** default options are fine.

---

## Step 1 — Clone the Repository

Open **PowerShell** or **Command Prompt**:

```bash
cd C:\
git clone https://github.com/sylvernjones557/FEB10.git
cd FEB10
```

---

## Step 2 — Backend Setup

### 2a. Create virtual environment and install dependencies

```bash
cd backend_smart_presence
python -m venv .venv
```

### 2b. Activate the virtual environment

**PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

**CMD:**
```cmd
.venv\Scripts\activate.bat
```

### 2c. Install Python packages

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> This installs FastAPI, InsightFace (CPU), ChromaDB, PostgreSQL driver, etc.
> On a slow connection this may take 5–10 minutes. Total size ~500 MB.

### 2d. Verify the `.env` file exists

The `.env` file is already included in the repo with the Supabase database credentials.
Check it's there:

```bash
type .env
```

You should see `DATABASE_URL=postgresql://...` and `SUPABASE_URL=...`.

### 2e. Initialize the database tables

```bash
python scripts/create_tables.py
python scripts/seed_v2.py
```

### 2f. Start the backend server

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

> **First start takes 30–60 seconds** as InsightFace downloads the face model (~15 MB).
> Subsequent starts are instant.

**Leave this terminal open.** Open a new terminal for Step 3.

---

## Step 3 — Frontend Setup

### 3a. Install Node.js dependencies

```bash
cd C:\FEB10\frontend_smart_presence
npm install
```

### 3b. Configure the API URL

Edit `frontend_smart_presence/.env`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_DEV_HTTPS=true
```

> If running the frontend on a **different PC** than the backend (e.g. phone testing),
> change `127.0.0.1` to the backend PC's IP address (e.g. `192.168.1.50`).

### 3c. Start the frontend dev server

```bash
npm run dev
```

You should see:
```
VITE v6.x.x  ready in XXXms
➜  Local:   https://localhost:3000/
➜  Network: https://192.168.x.x:3000/
```

---

## Step 4 — Access the App

Open **Chrome** or **Edge** and go to:

```
https://127.0.0.1:3000
```

> The browser will show a "Not Secure" warning because of the self-signed HTTPS cert.
> Click **Advanced → Proceed** to continue. This is safe on localhost.

### Login Credentials

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| `admin` | `admin` | ADMIN | Full dashboard, student management, enrollment |
| `testclass` | `testclass` | STAFF | Test Class — unlimited sessions, all students |

---

## Step 5 — Register Student Faces

1. Login as `admin`
2. Go to **Enrollment** from the sidebar
3. Fill in student details → **Proceed to Camera Scan**
4. Capture 3 angles (Front, Left, Right)
5. Repeat for each student

> **Duplicate face protection** is active — if the same face is already registered
> to another student, registration will be blocked with an error.

---

## Step 6 — Take Attendance

1. Login as `testclass` (or any staff account)
2. Go to **Attendance**
3. Select a class group
4. Press **Start** — the camera opens and scans faces in real-time
5. Recognized faces show **blue bounding boxes with names**
6. Unrecognized faces show **yellow dashed boxes with "Scanning…"**
7. Press **Finalize** to save — shows a summary of Present/Absent students

---

## Mobile / Phone Access

To access from a phone on the **same WiFi network**:

1. Find the PC's IP address:
   ```bash
   ipconfig
   ```
   Look for `IPv4 Address` under your WiFi adapter (e.g. `192.168.1.50`).

2. Update `frontend_smart_presence/.env`:
   ```dotenv
   VITE_API_BASE_URL=http://192.168.1.50:8000/api/v1
   ```

3. Restart the frontend: `npm run dev`

4. On your phone browser, go to:
   ```
   https://192.168.1.50:3000
   ```

5. Accept the security warning → Login → Use the app.

---

## Troubleshooting

### "Module not found" or import errors
```bash
cd backend_smart_presence
.venv\Scripts\activate
pip install -r requirements.txt
```

### Backend won't start — port 8000 in use
```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen | Stop-Process -Id {$_.OwningProcess} -Force
```

### Camera not working on phone
- HTTPS is required for camera access on non-localhost. Make sure you're accessing via `https://`.
- Accept the self-signed cert warning.

### Face model download fails
The InsightFace model is auto-downloaded on first run. If your network blocks it:
1. Download `buffalo_sc` from https://github.com/deepinsight/insightface/releases
2. Place in `C:\Users\<YourUser>\.insightface\models\buffalo_sc\`

### "No face detected" during enrollment
- Ensure good lighting (no harsh backlight)
- Face should be clearly visible, centered, not too close/far
- Remove glasses if detection fails repeatedly

### ChromaDB errors
```bash
cd backend_smart_presence
rmdir /s /q chroma_store
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
ChromaDB will auto-recreate on next startup.

---

## Quick Reference — All Commands

```bash
# === BACKEND (Terminal 1) ===
cd C:\FEB10\backend_smart_presence
.venv\Scripts\activate          # or Activate.ps1 in PowerShell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# === FRONTEND (Terminal 2) ===
cd C:\FEB10\frontend_smart_presence
npm run dev

# === CLEAR ALL FACE DATA (if needed) ===
# Login as admin, then:
curl -X POST http://127.0.0.1:8000/api/v1/recognition/clear-faces -H "Authorization: Bearer <token>"
```

---

## System Requirements (Minimum)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 | Windows 10/11 |
| CPU | Intel i3 / AMD Ryzen 3 | Intel i5 / Ryzen 5 |
| RAM | 4 GB | 8 GB |
| Storage | 2 GB free | 5 GB free |
| GPU | Not required | Not required |
| Network | LAN/WiFi (for mobile access) | Same |
| Camera | Any USB webcam / laptop cam | 720p+ |
