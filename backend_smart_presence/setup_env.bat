@echo off
echo ============================================
echo   Smart Presence - Backend Setup (CPU-Only)
echo ============================================
echo.

if not exist .venv (
    echo [INFO] Creating Virtual Environment (.venv)...
    python -m venv .venv
)

echo [INFO] Activating VENV...
call .venv\Scripts\activate.bat

echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

echo [INFO] Installing CPU-Only Dependencies...
pip install -r requirements.txt

echo.
echo [INFO] Ensuring CPU-only ONNX Runtime (removing any GPU packages)...
pip uninstall -y onnxruntime-gpu >nul 2>nul
echo [INFO] CPU-only runtime confirmed.

echo.
echo [INFO] Creating database tables...
python scripts/create_tables.py

echo.
echo ============================================
echo   Setup complete! (CPU-Only Mode)
echo   GPU packages removed for best performance.
echo   Run 'run_server.bat' to start.
echo ============================================
pause
