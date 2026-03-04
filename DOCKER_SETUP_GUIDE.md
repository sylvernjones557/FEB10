# Docker Setup Guide — Smart Presence Backend

## Why Docker?

The backend uses InsightFace, ONNX Runtime, OpenCV, and other native C++ libraries that can have **dependency conflicts on Windows**, especially on college PCs where:
- Python versions may differ between machines
- Visual C++ Build Tools may not be installed  
- `pip install` for `onnxruntime`, `insightface`, `psycopg2` can fail with cryptic errors
- Virtual environments break when copied between PCs

**Docker solves all of this** — the backend runs inside a Linux container with all dependencies pre-installed. It works the same on every PC.

---

## Prerequisites

### 1. Install Docker Desktop (one-time)

Download from: **https://www.docker.com/products/docker-desktop/**

> **For college PCs with Windows 10/11:**
> - During install, choose **WSL 2 backend** (recommended)
> - If WSL 2 is not available, it will use Hyper-V
> - After install, **restart the PC**
> - Open Docker Desktop and wait until the whale icon in taskbar shows "Docker Desktop is running"

### 2. System Requirements
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk Space | 3 GB free | 5 GB free |
| CPU | Any dual-core | Any quad-core |
| OS | Windows 10 (build 19041+) | Windows 10/11 |

> Docker uses ~500MB RAM for itself. The backend container uses ~512MB-1.5GB depending on face recognition load.

---

## Quick Start

### Option A: Double-click (easiest)

1. Open Docker Desktop and wait until it's ready
2. Double-click **`docker_start.bat`** in the project root
3. Wait for "Backend is running" message
4. Open frontend with `npm run dev` in `frontend_smart_presence/`

### Option B: Command line

```bash
# From project root (E:\FEB10)
cd E:\FEB10

# Build the Docker image (first time takes 3-5 min, subsequent times ~10 sec)
docker compose build backend

# Start the backend
docker compose up -d backend

# Check if it's running
docker compose ps

# View logs
docker compose logs -f backend

# Stop when done
docker compose down
```

---

## How It Works

```
┌──────────────────────────────────────────────────┐
│  Your College PC (Windows)                       │
│                                                  │
│  ┌──────────────────────┐   ┌─────────────────┐ │
│  │  Frontend (local)    │   │ Docker Container │ │
│  │  https://localhost:3000│  │ (host network)  │ │
│  │  Vite + React + TS   │──▶│ Backend API     │ │
│  │  (runs directly in   │   │ FastAPI+Uvicorn │ │
│  │   Windows, no Docker)│   │ Port 8000       │ │
│  └──────────────────────┘   │                 │ │
│                              │ InsightFace    │ │
│                              │ ONNX Runtime   │ │
│                              │ OpenCV         │ │
│                              │ ChromaDB       │ │
│                              └────────┬────────┘ │
│                                       │          │
│                    ┌──────────────────┘          │
│                    ▼                              │
│            Supabase PostgreSQL (cloud)            │
└──────────────────────────────────────────────────┘
```

> **Note:** The container uses `network_mode: host` which means it shares 
> the host PC's network stack directly. This is needed because Supabase 
> resolves to an IPv6 address, and Docker's default bridge network can't 
> route IPv6. With host networking, port 8000 is directly available.

---

## Common Commands

| Command | What it does |
|---------|-------------|
| `docker compose up -d backend` | Start backend in background |
| `docker compose down` | Stop backend |
| `docker compose restart backend` | Restart backend |
| `docker compose logs -f backend` | View live logs |
| `docker compose ps` | Check container status |
| `docker compose build --no-cache backend` | Rebuild from scratch |

---

## Troubleshooting

### "Docker is not running"
→ Open Docker Desktop app and wait for the whale icon. It takes 30-60 seconds on first launch.

### Build fails with network error
→ College proxy/firewall may be blocking. Try:
```bash
docker compose build --no-cache backend
```
Or set proxy in Docker Desktop → Settings → Resources → Proxies.

### "Port 8000 already in use"
→ Stop the old backend process:
```bash
# PowerShell
Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
Then retry `docker compose up -d backend`.

### Container starts but health check fails
→ Check logs:
```bash
docker compose logs backend
```
Common cause: `.env` file missing or DATABASE_URL is wrong.

### "WSL 2 installation is incomplete"
→ Open PowerShell as Admin and run:
```powershell
wsl --install
```
Then restart the PC.

### Very slow on 4GB RAM PC
→ Lower Docker memory in Docker Desktop → Settings → Resources → Memory → set to 1.5 GB.
Also set in `docker-compose.yml` the memory limit:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
```

### C: drive full / Docker I/O errors
Docker stores its data on C: by default (~20 GB). If C: is full, move it to another drive:

```powershell
# 1. Stop Docker Desktop and WSL
Stop-Process -Name "Docker Desktop" -Force
wsl --shutdown

# 2. Create destination on a drive with space (e.g. E:)
New-Item -ItemType Directory -Path "E:\DockerData\wsl" -Force

# 3. Copy Docker data
Copy-Item -Path "$env:LOCALAPPDATA\Docker\wsl\*" -Destination "E:\DockerData\wsl" -Recurse -Force

# 4. Remove old data and create symlink
Remove-Item -Path "$env:LOCALAPPDATA\Docker\wsl" -Recurse -Force
New-Item -ItemType Junction -Path "$env:LOCALAPPDATA\Docker\wsl" -Target "E:\DockerData\wsl"

# 5. Restart Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

---

## Updating the Backend

When you change backend code:

```bash
# Rebuild the image with changes
docker compose build backend

# Restart with new image
docker compose up -d backend
```

---

## Removing Docker (if needed)

```bash
# Remove containers and volumes
docker compose down -v

# Remove the built image
docker rmi smart_presence_backend
```

Then uninstall Docker Desktop from Windows Settings → Apps.
