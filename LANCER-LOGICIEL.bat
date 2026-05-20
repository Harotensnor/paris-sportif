@echo off
chcp 65001 >nul
title Paris-Sportif Desktop
cd /d "%~dp0"
set "APP_ROOT=%~dp0"
if not exist "desktop\state" mkdir "desktop\state" >nul 2>nul
set "LAUNCH_LOG=%APP_ROOT%desktop\state\launcher.log"
echo [%date% %time%] Lancement Paris-Sportif depuis "%APP_ROOT%" > "%LAUNCH_LOG%"

rem Nettoie les anciens lanceurs caches de CE projet, mais garde ce cmd courant.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$me=(Get-CimInstance Win32_Process -Filter ('ProcessId=' + $PID)).ParentProcessId; Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'cmd.exe' -and $_.ProcessId -ne $me -and $_.CommandLine -and $_.CommandLine -like '*Paris-Sportif*LANCER-LOGICIEL.bat*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [%date% %time%] ERREUR: Node.js introuvable dans le PATH. >> "%LAUNCH_LOG%"
  echo.
  echo Node.js n'est pas installe ou pas dans le PATH.
  echo Installe Node.js puis relance ce fichier.
  echo.
  exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  if exist "desktop\node_modules\electron\dist\electron.exe" goto launch_electron
  echo [%date% %time%] ERREUR: npm introuvable et Electron local absent. >> "%LAUNCH_LOG%"
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
  echo [%date% %time%] Installation npm dans desktop... >> "%LAUNCH_LOG%"
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo [%date% %time%] ERREUR: npm install a echoue avec code %ERRORLEVEL%. >> "%LAUNCH_LOG%"
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
  echo [%date% %time%] Ouverture Electron direct. >> "%LAUNCH_LOG%"
  start "" /D "%APP_ROOT%desktop" "%APP_ROOT%desktop\node_modules\electron\dist\electron.exe" "%APP_ROOT%desktop"
  exit /b 0
)

cd desktop
echo [%date% %time%] Ouverture via npm start. >> "%LAUNCH_LOG%"
start "" npm start
exit /b 0
