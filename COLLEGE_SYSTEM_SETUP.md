# College System Setup Guide (CPU Optimization)

This guide provides instructions for setting up the Smart Presence system on older, CPU-based machines typically found in college labs.

## 1. System Requirements & Preparation
- **Python:** 3.9+ (3.10 recommended)
- **Node.js:** 18+
- **Hardware:** CPU-only support is prioritized. Minimum 4GB RAM (8GB recommended).

## 2. GitHub: Pulling Updates
Always ensure you have latest updates before working:
```powershell
# In the project root (e.g., E:\FEB10)
git pull origin main
```

## 3. Backend Setup (CPU Optimized)
The backend is pre-configured to use the **Small/Fast (sc)** model to ensure responsiveness on old hardware.

### Installation
```powershell
cd backend_smart_presence

# 1. Create a fresh virtual environment
python -m venv venv

# 2. Activate venv
.\venv\Scripts\Activate.ps1

# 3. Install CPU-specific libraries
pip install -r requirements_cpu.txt
```

### Performance Tuning
If the system is still slow, you can adjust these settings in `backend_smart_presence/.env`:
- `FACE_DET_SIZE_CPU=320`: Lowering this (e.g., to 240) increases speed but might miss faces further away.
- `FACE_MODEL_NAME=buffalo_sc`: The smallest and fastest model (currently set).

## 4. Frontend Setup
```powershell
cd frontend_smart_presence

# 1. Install dependencies
npm install

# 2. Run in dev mode (fastest for development)
npm run dev
```

### Important: Frontend IP Configuration
If the frontend and backend are on the same machine, ensure `frontend_smart_presence/.env` points to:
`VITE_API_BASE_URL=http://localhost:8000/api/v1`

If you are accessing the UI from another computer (e.g., a teacher's laptop), use the college system's IP address (e.g., `http://192.168.x.x:8000/api/v1`).

## 5. Performance Tips for Older Machines
1. **Model Cold Start:** The first time you run the backend, it will download the AI models (~200MB). This might take time depending on college internet.
2. **Close Browser Tabs:** Old machines struggle with memory. Close unnecessary tabs while running the system.
3. **Camera Quality:** Use a resolution of 640x480 for the webcam. Higher resolutions (1080p) will significantly slow down the CPU inference.
4. **Vite Clean:** If the frontend feels laggy, run `npm run build` once to check if it's a dev-server overhead issue, though `npm run dev` is usually sufficient.

## 6. Cleanup Utility
To keep the system clean and fast, you can run:
```powershell
# Remove temp python files
Get-ChildItem -Path . -Filter "__pycache__" -Recurse | Remove-Item -Recurse -Force
```
