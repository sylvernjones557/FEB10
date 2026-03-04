@echo off
echo ========================================
echo  Smart Presence — Unified Docker Setup
echo  Backend + Frontend in ONE Container
echo  For College Low-End PCs
echo ========================================
echo.

:: Check if Docker is installed
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    echo After installing, restart your PC and run this script again.
    pause
    exit /b 1
)

echo [OK] Docker is installed
echo.

:: Check if Docker daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop and wait until it's ready,
    echo then run this script again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

:: Check if .env file exists
if not exist "%~dp0backend_smart_presence\.env" (
    echo [ERROR] Missing .env file!
    echo.
    echo Please create: backend_smart_presence\.env
    echo with your Supabase credentials (DATABASE_URL, SUPABASE_URL, etc.)
    pause
    exit /b 1
)

echo [OK] Environment file found
echo.

:: Navigate to project root
cd /d "%~dp0"

echo [STEP 1/3] Building unified Docker image (first time takes 5-10 minutes)...
echo           This includes: Backend API + Frontend UI + AI Models
echo.
docker compose build smartpresence
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Docker build failed! Check the error above.
    echo.
    echo Common fixes:
    echo   - Make sure Docker Desktop is running
    echo   - Check your internet connection
    echo   - Try: docker compose build --no-cache
    pause
    exit /b 1
)

echo.
echo [STEP 2/3] Starting Smart Presence container...
echo.
docker compose up -d smartpresence
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to start container! Check the error above.
    pause
    exit /b 1
)

echo.
echo [STEP 3/3] Waiting for system to be ready...
timeout /t 10 /nobreak >nul

:: Health check with retry
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WAIT] System still starting (loading AI models)... waiting 20 more seconds
    timeout /t 20 /nobreak >nul
)

curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WAIT] Still loading... waiting 30 more seconds (first run downloads AI models)
    timeout /t 30 /nobreak >nul
)

curl -s http://localhost:8000/health
echo.
echo.
echo ========================================
echo  Smart Presence is RUNNING!
echo.
echo  Open in browser:
echo    http://localhost:8000
echo.
echo  API Documentation:
echo    http://localhost:8000/api/v1/docs
echo.
echo  Commands:
echo    Stop:    docker_stop.bat
echo    Logs:    docker compose logs -f
echo    Restart: docker compose restart
echo ========================================
pause
