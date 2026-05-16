@echo off
chcp 65001 >nul
title Paris-Sportif Desktop
cd /d "%~dp0"
set "APP_ROOT=%~dp0"

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo.
  echo Node.js n'est pas installe ou pas dans le PATH.
  echo Installe Node.js puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo.
  echo npm est introuvable. Reinstalle Node.js puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

if not exist "desktop\node_modules\electron" (
  echo.
  echo Premiere ouverture : installation du moteur desktop...
  cd desktop
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo.
    echo Installation impossible.
    pause
    exit /b 1
  )
  cd ..
)

rem Ferme uniquement l'ancienne fenêtre Electron de CE projet avant relance.
rem Sinon le single-instance lock remet l'ancienne UI devant et les changements
rem semblent invisibles.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=$env:APP_ROOT.TrimEnd('\'); Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -like '*electron*' -and $_.CommandLine -like ('*' + $root + '\desktop*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul

cd desktop
call npm start
