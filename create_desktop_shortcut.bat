@echo off
TITLE Create Jal-Satark Desktop Shortcut
echo ======================================================================
echo    Creating Desktop Shortcut for Jal-Satark Platform
echo ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_desktop_shortcut.ps1"

echo.
pause
