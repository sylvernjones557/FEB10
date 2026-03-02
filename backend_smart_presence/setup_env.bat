@echo off
echo ============================================
echo   Smart Presence - Backend Setup
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

echo [INFO] Installing Dependencies...
pip install -r requirements.txt

echo.
echo [INFO] Detecting GPU runtime support...
where nvidia-smi >nul 2>nul
if %errorlevel%==0 (
    echo [INFO] NVIDIA GPU detected. Switching to ONNX Runtime GPU package...
    pip uninstall -y onnxruntime >nul 2>nul
    pip install onnxruntime-gpu==1.16.3
    if %errorlevel% neq 0 (
        echo [WARN] GPU package install failed. Falling back to CPU runtime.
        pip uninstall -y onnxruntime-gpu >nul 2>nul
        pip install onnxruntime==1.16.3
    )
) else (
    echo [INFO] No NVIDIA GPU detected. Using CPU runtime (default).
)

echo.
echo [INFO] Creating database tables...
python scripts/create_tables.py

echo.
echo ============================================
echo   Setup complete! Run 'run_server.bat' to start.
echo ============================================
pause
