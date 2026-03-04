# Smart Presence — How to Run (Fresh Setup)

> **One Docker container runs everything — Backend API + Frontend UI.**
> No Python, Node.js, or any packages needed on your PC.
> Database stays in the cloud (Supabase).

---

## Prerequisites — Install Only 2 Things

| # | Software | Why | Download Link |
|---|----------|-----|---------------|
| 1 | **Docker Desktop** | Runs the entire app in a container | https://www.docker.com/products/docker-desktop/ |
| 2 | **Git** | Clone the project from GitHub | https://git-scm.com/download/win |

### Docker Desktop Install Notes
- During installation, it will enable **WSL 2** (Windows Subsystem for Linux) — allow it
- If asked, **restart your PC** after install
- On very old PCs, you may need to enable **VT-x / AMD-V in BIOS** (ask your lab admin)
- After install, open Docker Desktop and wait until it shows **"Docker Desktop is running"** (green icon in system tray)

### Minimum PC Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk | 5 GB free | 10 GB free |
| CPU | Any dual-core (i3/Celeron/AMD) | i5 or better |
| OS | Windows 10 64-bit | Windows 10/11 64-bit |
| Internet | Required (for Supabase DB) | Stable WiFi/LAN |

---

## Step-by-Step Setup

### Step 1 — Clone the Repository

Open **Command Prompt** or **PowerShell** and run:

```bat
git clone https://github.com/sylvernjones557/FEB10.git
cd FEB10
```

### Step 2 — Create the Environment File

```bat
copy backend_smart_presence\.env.example backend_smart_presence\.env
notepad backend_smart_presence\.env
```

This opens `Notepad`. Fill in these **3 required values** with your Supabase credentials:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...YOUR_KEY_HERE
```

> **Where to find these values:**
> 1. Go to https://supabase.com → Open your project
> 2. **DATABASE_URL:** Settings → Database → Connection string (URI)
> 3. **SUPABASE_URL:** Settings → API → Project URL
> 4. **SUPABASE_SERVICE_ROLE_KEY:** Settings → API → service_role key (secret)

Save the file and close Notepad.

### Step 3 — Run the App (One Command)

Make sure **Docker Desktop is running** (green whale icon in system tray), then:

```bat
docker_start.bat
```

**What happens automatically:**
1. Checks Docker is installed and running
2. Checks your `.env` file exists
3. Builds the Docker image (downloads Python 3.11, Node.js 20, all packages, builds React frontend)
4. Starts the container
5. Waits for health check to pass
6. Tells you it's ready

> **First run takes 5–10 minutes** (downloads ~2.5 GB of Docker layers).
> Subsequent runs start in **5–10 seconds** (cached).

### Step 4 — Open in Browser

```
http://localhost:8000
```

| URL | What |
|-----|------|
| `http://localhost:8000` | Frontend (Login Page) |
| `http://localhost:8000/api/v1/docs` | API Documentation (Swagger) |
| `http://localhost:8000/health` | Health Check |

---

## Daily Usage

### Start the App
```bat
docker_start.bat
```

### Stop the App
```bat
docker_stop.bat
```

### View Live Logs (for debugging)
```bat
docker compose logs -f
```

### Restart the App
```bat
docker compose restart
```

### After PC Reboot
1. Open **Docker Desktop** and wait for it to start
2. Run `docker_start.bat`

---

## Troubleshooting

### "Docker is not installed"
→ Download and install Docker Desktop from https://www.docker.com/products/docker-desktop/

### "Docker Desktop is not running"
→ Open Docker Desktop from Start Menu, wait for it to fully start (green whale icon in system tray)

### "Missing .env file"
→ Run: `copy backend_smart_presence\.env.example backend_smart_presence\.env`
→ Then edit it with your Supabase credentials

### "Docker build failed"
→ Check internet connection
→ Try: `docker compose build --no-cache`
→ Make sure Docker Desktop has at least 4 GB RAM allocated (Settings → Resources)

### "Address already in use" (port 8000)
→ Something else is using port 8000. Either:
  - Stop the other program, OR
  - Close all terminals and run `docker compose down` first, then `docker_start.bat`

### "Unable to connect to the remote server"
→ The container is still starting. Wait 30 seconds and try again.
→ Check: `docker logs smart_presence --tail 20`

### App is slow / face recognition is slow
→ Normal on low-end PCs — the AI model runs on CPU. First recognition takes 5–10 seconds (model loads), subsequent ones take 1–3 seconds.

### "Network is unreachable" in logs
→ Supabase uses IPv6 which Docker can't always reach. The Docker setup already forces IPv4 DNS (8.8.8.8), but if you still see this:
  - Check your internet connection
  - Try: `docker compose down` then `docker_start.bat`

---

## What's Inside the Docker Container

You don't need to install any of this — Docker handles it all:

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11 | Backend runtime |
| FastAPI | 0.109.0 | REST API framework |
| Uvicorn | 0.27.0 | ASGI server |
| InsightFace | 0.7.3 | Face recognition AI (buffalo_sc model) |
| ONNXRuntime | 1.16.3 | AI inference engine (CPU-only) |
| OpenCV | 4.8.1 | Image processing |
| ChromaDB | 0.4.22 | Vector database for face embeddings |
| SQLAlchemy | 2.0.25 | Database ORM |
| React | 19.x | Frontend UI |
| Node.js | 20 | Frontend build (build stage only, not in final image) |

### Resource Usage
| Metric | Value |
|--------|-------|
| Docker image size | ~2.5 GB |
| Idle RAM usage | ~86 MB |
| RAM during face recognition | ~1–1.5 GB |
| CPU idle | < 1% |
| RAM limit (capped) | 2 GB |
| CPU limit (capped) | 2 cores |

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Docker Container              │
│            (port 8000)                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    FastAPI (Python 3.11)        │    │
│  │    └── /api/v1/*  → REST API   │    │
│  │    └── /health    → Health     │    │
│  │    └── /*         → Frontend   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────────┐  ┌───────────────┐    │
│  │ React Build  │  │ InsightFace   │    │
│  │ (static HTML │  │ AI Engine     │    │
│  │  JS, CSS)    │  │ (CPU-only)    │    │
│  └──────────────┘  └───────────────┘    │
│                                         │
│  ┌──────────────┐                       │
│  │ ChromaDB     │ (face embeddings)     │
│  │ (persisted   │                       │
│  │  via volume) │                       │
│  └──────────────┘                       │
└────────────────┬────────────────────────┘
                 │ Internet
                 ▼
     ┌──────────────────────┐
     │  Supabase (Cloud)    │
     │  PostgreSQL Database  │
     └──────────────────────┘
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| First-time setup | `git clone ... → edit .env → docker_start.bat` |
| Start | `docker_start.bat` |
| Stop | `docker_stop.bat` |
| Restart | `docker compose restart` |
| View logs | `docker compose logs -f` |
| Force rebuild | `docker compose build --no-cache` |
| Remove everything | `docker compose down -v` |
| Check status | `docker ps` |
| Open app | `http://localhost:8000` |
| API docs | `http://localhost:8000/api/v1/docs` |
