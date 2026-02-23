@echo off
echo [INFO] Starting Smart Presence Backend...
call venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
