@echo off
echo [INFO] Starting Smart Presence Backend (CPU-Only Low-Power Mode)...

:: Force CPU-only environment
set CUDA_VISIBLE_DEVICES=
set ONNXRUNTIME_PROVIDERS=CPUExecutionProvider
set OMP_NUM_THREADS=2
set OMP_WAIT_POLICY=PASSIVE
set MKL_NUM_THREADS=2
set OPENBLAS_NUM_THREADS=2
set NUMEXPR_NUM_THREADS=2

if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo [ERROR] No virtual environment found. Run setup first.
    pause
    exit /b 1
)

echo [INFO] CPU threads limited to 2. GPU disabled.
echo [INFO] Server starting on http://0.0.0.0:8000
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --workers 1 --limit-concurrency 10 --timeout-keep-alive 30
