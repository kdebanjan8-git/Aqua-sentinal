@echo off
TITLE Jal-Satark Clean Shutdown
echo ======================================================================
echo    Stopping Jal-Satark: Terminating Background Services
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"

echo.
pause
