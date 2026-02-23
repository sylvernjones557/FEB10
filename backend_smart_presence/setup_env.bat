@echo off
if not exist venv (
    echo [INFO] Creating Virtual Environment...
    python -m venv venv
)

echo [INFO] Activating VENV...
call venv\Scripts\activate

echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

echo [INFO] Installing Dependencies (CPU Default)...
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
    echo [INFO] No NVIDIA GPU detected. Ensuring CPU runtime package...
    pip uninstall -y onnxruntime-gpu >nul 2>nul
    pip install onnxruntime==1.16.3
)

echo [INFO] Runtime setup complete. Face engine will auto-select GPU/CPU at startup.
echo.
echo [INFO] Setup API is ready to run.
pause
