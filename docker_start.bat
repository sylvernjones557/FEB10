@echo off
echo ========================================
echo  Smart Presence — Docker Backend Setup
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

:: Navigate to project root
cd /d "%~dp0"

echo [STEP 1] Building backend Docker image (this may take 3-5 minutes first time)...
echo.
docker compose build backend
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Docker build failed! Check the error above.
    pause
    exit /b 1
)

echo.
echo [STEP 2] Starting backend container...
echo.
docker compose up -d backend
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to start container! Check the error above.
    pause
    exit /b 1
)

echo.
echo [STEP 3] Waiting for backend to be ready...
timeout /t 10 /nobreak >nul

:: Health check
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WAIT] Backend still starting... waiting 20 more seconds
    timeout /t 20 /nobreak >nul
)

curl -s http://localhost:8000/health
echo.
echo.
echo ========================================
echo  Backend is running at:
echo    http://localhost:8000
echo    API Docs: http://localhost:8000/api/v1/docs
echo.
echo  To stop:  docker compose down
echo  To logs:  docker compose logs -f backend
echo  To restart: docker compose restart backend
echo ========================================
pause
