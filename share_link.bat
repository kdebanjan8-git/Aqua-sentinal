@echo off
TITLE Jal-Satark Public Live Link Generator
echo ======================================================================
echo    Jal-Satark: Generating Instant Public HTTPS Live Link
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0share_link.ps1"

echo.
pause
