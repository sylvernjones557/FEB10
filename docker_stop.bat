@echo off
echo ========================================
echo  Smart Presence — Stop Docker Container
echo ========================================
echo.

cd /d "%~dp0"

echo Stopping Smart Presence container...
docker compose down

echo.
echo [OK] Smart Presence stopped.
echo.
echo To start again, run: docker_start.bat
echo To remove all data:  docker compose down -v
pause
