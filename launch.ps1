# Jal-Satark PowerShell Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   Starting Jal-Satark: Regional Water & Health Intelligence Platform" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Terminate any previous orphaned processes
Write-Host "[1/5] Checking for existing instances and freeing ports (5173, 5000, 8000)..." -ForegroundColor Yellow
$ports = 5173, 5000, 8000
foreach ($p in $ports) {
    Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

$root = $PSScriptRoot

# 2. Start FastAPI ML Service
Write-Host "[2/5] Starting FastAPI ML Engine on http://localhost:8000..." -ForegroundColor Green
$pythonPath = if (Test-Path "$root\ml-service\venv\Scripts\python.exe") { "$root\ml-service\venv\Scripts\python.exe" } else { "python" }
Start-Process -FilePath $pythonPath -ArgumentList "-m uvicorn app.main:app --port 8000 --host 0.0.0.0" -WorkingDirectory "$root\ml-service" -WindowStyle Minimized

# 3. Start Node.js Express Backend
Write-Host "[3/5] Starting Node.js Backend API on http://localhost:5000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start" -WorkingDirectory "$root\backend" -WindowStyle Minimized

# 4. Start React / Vite Frontend
Write-Host "[4/5] Starting React / Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "$root\frontend" -WindowStyle Minimized

# 5. Wait for frontend to become responsive
Write-Host "[5/5] Waiting for services to become responsive..." -ForegroundColor Yellow
$attempts = 0
while ($attempts -lt 40) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 1
        if ($res.StatusCode -eq 200) {
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 500
    $attempts++
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! All services are active and running:" -ForegroundColor Green
Write-Host "  - Web Dashboard:     http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API:       http://localhost:5000" -ForegroundColor White
Write-Host "  - ML Prediction:     http://localhost:8000 (Swagger: /docs)" -ForegroundColor White
Write-Host ""
Write-Host "  To share public HTTPS link with other devices, run: .\share_link.bat" -ForegroundColor Yellow
Write-Host "  To safely terminate all services, run:              .\stop.bat" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:5173"
Write-Host "Opening browser at http://localhost:5173..." -ForegroundColor Green
