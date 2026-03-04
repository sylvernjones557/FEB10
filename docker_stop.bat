@echo off
echo ========================================
echo  Smart Presence — Stop Docker Backend
echo ========================================
echo.

cd /d "%~dp0"

echo Stopping backend container...
docker compose down

echo.
echo [OK] Backend stopped.
echo.
echo To start again, run: docker_start.bat
pause
