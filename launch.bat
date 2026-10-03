@echo off
TITLE Jal-Satark Launcher
echo ======================================================================
echo    Starting Jal-Satark: Regional Water ^& Health Intelligence Platform
echo ======================================================================
echo.

REM 1. Terminate any previous orphaned processes on ports 5173, 5000, 8000
echo [1/5] Checking for existing instances and freeing ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5173,5000,8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; exit 0"

REM 2. Determine Python executable (venv or system)
set "PY_CMD=python"
if exist "%~dp0ml-service\venv\Scripts\python.exe" set "PY_CMD=%~dp0ml-service\venv\Scripts\python.exe"

REM 3. Start FastAPI ML Service (Port 8000)
echo [2/5] Starting FastAPI ML Engine on http://localhost:8000...
start "Jal-Satark ML Service (Port 8000)" /min cmd /c "cd /d "%~dp0ml-service" && "%PY_CMD%" -m uvicorn app.main:app --port 8000 --host 0.0.0.0"

REM 4. Start Node.js Express Backend (Port 5000)
echo [3/5] Starting Node.js Backend API on http://localhost:5000...
start "Jal-Satark Backend API (Port 5000)" /min cmd /c "cd /d "%~dp0backend" && npm start"

REM 5. Start React/Vite Frontend (Port 5173)
echo [4/5] Starting React / Vite Frontend on http://localhost:5173...
start "Jal-Satark Frontend UI (Port 5173)" /min cmd /c "cd /d "%~dp0frontend" && npm run dev"

REM 6. Wait for Frontend to be responsive and automatically open browser
echo [5/5] Waiting for services to initialize...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$attempts = 0; while ($attempts -lt 40) { try { $res = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { break } } catch {}; Start-Sleep -Milliseconds 500; $attempts++ }; exit 0"

echo.
echo ======================================================================
echo   SUCCESS! All services are active and running:
echo   - Web Dashboard:     http://localhost:5173
echo   - Backend API:       http://localhost:5000
echo   - ML Prediction:     http://localhost:8000 (Swagger: /docs)
echo.
echo   To share public HTTPS link with other devices, run: share_link.bat
echo   To safely terminate all services, run:              stop.bat
echo ======================================================================
echo.

REM Automatically open default browser
start http://localhost:5173

echo Opening browser at http://localhost:5173...
echo Press any key to close this launcher window (services remain running).
pause >nul
