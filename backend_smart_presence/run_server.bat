@echo off
echo [INFO] Starting Smart Presence Backend...
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo [ERROR] No virtual environment found. Run setup first.
    pause
    exit /b 1
)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
