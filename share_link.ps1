# Jal-Satark Public Live Link Generator (PowerShell)
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   Jal-Satark: Generating Instant Public HTTPS Live Link" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if frontend is active on port 5173
$conn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if (!$conn) {
    Write-Host "[Notice] Frontend on port 5173 does not seem to be running yet." -ForegroundColor Yellow
    Write-Host "Starting background services via launch.bat first..." -ForegroundColor Yellow
    $launchScript = Join-Path $PSScriptRoot "launch.bat"
    Start-Process -FilePath $launchScript
    Start-Sleep -Seconds 4
}

Write-Host "Fetching public IP for tunnel password verification (if prompted by localtunnel)..." -ForegroundColor Gray
$publicIp = try { (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 3).Trim() } catch { "Check https://api.ipify.org" }

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  TUNNEL SETUP READY:" -ForegroundColor Green
Write-Host "  - Local Port:       5173 (React Dashboard)" -ForegroundColor White
Write-Host "  - Tunnel Password:  $publicIp (If prompted by localtunnel page)" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Launching localtunnel... Your public URL will appear below:" -ForegroundColor Green
Write-Host ""

npx --yes localtunnel --port 5173
