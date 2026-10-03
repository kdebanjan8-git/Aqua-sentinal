# Create Desktop Shortcut for Jal-Satark
$desktopPath = [Environment]::GetFolderPath('Desktop')
$currentDir = $PSScriptRoot
$targetPath = Join-Path $currentDir 'launch.bat'

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut((Join-Path $desktopPath 'Jal-Satark.lnk'))
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $currentDir
$shortcut.Description = 'Jal-Satark: Regional Water & Health Intelligence Platform'
$shortcut.IconLocation = 'shell32.dll,14'
$shortcut.Save()

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Desktop Shortcut Created Successfully!" -ForegroundColor Green
Write-Host "  Location: $(Join-Path $desktopPath 'Jal-Satark.lnk')" -ForegroundColor White
Write-Host "  Target:   $targetPath" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
