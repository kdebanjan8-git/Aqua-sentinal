# Jal-Satark Clean Shutdown PowerShell Script
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   Stopping Jal-Satark: Terminating Background Services" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$ports = 5173, 5000, 8000
$killed = 0

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $pId = $conn.OwningProcess
            try {
                $proc = Get-Process -Id $pId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host ("Terminating " + $proc.ProcessName + " (PID " + $pId + ") on port " + $port + "...") -ForegroundColor Yellow
                    Stop-Process -Id $pId -Force -ErrorAction SilentlyContinue
                    $killed++
                }
            } catch {}
        }
    }
}

Write-Host ""
if ($killed -eq 0) {
    Write-Host "No active processes found on ports 5173, 5000, or 8000. All clear!" -ForegroundColor Green
} else {
    Write-Host ("Cleaned up $killed process(es). Ports are now fully released.") -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   All Jal-Satark processes have been stopped cleanly." -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
