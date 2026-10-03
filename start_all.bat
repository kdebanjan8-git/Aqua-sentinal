@echo off
TITLE Jal-Satark Regional Water ^& Health Intelligence Platform
echo ======================================================================
echo    Starting Jal-Satark Platform (Backend, ML Service, Frontend)
echo ======================================================================
echo.

REM 0. Free ports 5173, 5000, 8000
echo [0/3] Checking for existing instances and freeing ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5173,5000,8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; exit 0"

REM 1. Determine Python executable (venv or system)
set "PY_CMD=python"
if exist "%~dp0ml-service\venv\Scripts\python.exe" set "PY_CMD=%~dp0ml-service\venv\Scripts\python.exe"

REM 2. Start Backend in a new window
echo [1/3] Starting Express Backend (Port 5000)...
start "Jal-Satark Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM 3. Start ML Service in a new window
echo [2/3] Starting FastAPI ML Engine (Port 8000)...
start "Jal-Satark ML Service" cmd /k "cd /d "%~dp0ml-service" && "%PY_CMD%" -m uvicorn app.main:app --port 8000 --reload"

REM 4. Start Frontend in a new window
echo [3/3] Starting Vite React Frontend (Port 5173)...
start "Jal-Satark Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo  All 3 services initiated!
echo  - Frontend: http://localhost:5173
echo  - Backend API: http://localhost:5000
echo  - ML Service: http://localhost:8000
echo ======================================================================
pause
