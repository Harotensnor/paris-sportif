@echo off
chcp 65001 >nul
title Paris-Sportif Desktop
cd /d "%~dp0"
set "APP_ROOT=%~dp0"

rem Nettoie les anciens lanceurs caches de CE projet, mais garde ce cmd courant.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$me=(Get-CimInstance Win32_Process -Filter ('ProcessId=' + $PID)).ParentProcessId; Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'cmd.exe' -and $_.ProcessId -ne $me -and $_.CommandLine -and $_.CommandLine -like '*Paris-Sportif*LANCER-LOGICIEL.bat*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo.
  echo Node.js n'est pas installe ou pas dans le PATH.
  echo Installe Node.js puis relance ce fichier.
  echo.
  exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  if exist "desktop\node_modules\electron\dist\electron.exe" goto launch_electron
  echo.
  echo npm est introuvable et le moteur desktop n'est pas installe.
  echo Reinstalle Node.js puis relance ce fichier.
  echo.
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
    exit /b 1
  )
  cd ..
)

rem Ferme uniquement l'ancienne fenêtre Electron de CE projet avant relance.
rem Sinon le single-instance lock remet l'ancienne UI devant et les changements
rem semblent invisibles.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=$env:APP_ROOT.TrimEnd('\'); Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -like '*electron*' -and $_.CommandLine -like ('*' + $root + '\desktop*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul

:launch_electron
if exist "desktop\node_modules\electron\dist\electron.exe" (
  start "" /D "%APP_ROOT%desktop" "%APP_ROOT%desktop\node_modules\electron\dist\electron.exe" "%APP_ROOT%desktop"
  exit /b 0
)

cd desktop
start "" npm start
exit /b 0
