@echo off
setlocal
REM Resolution de conflit de rebase sur paris-sportif-fresh.
REM Reset hard a l'etat remote, puis reapplique nos fichiers v27.3 par-dessus.

echo.
echo ============================================
echo   RESOLVE CONFLICT - v27.3 recovery
echo ============================================
echo.

set "FRESH_DIR=C:\Users\bouln\Documents\Claude\Projects\paris-sportif-fresh"
if not exist "%FRESH_DIR%\.git" (
  echo ERROR: paris-sportif-fresh introuvable. Relance DEPLOY-V20.bat pour cloner.
  pause
  exit /b 1
)
cd /d "%FRESH_DIR%"

echo [1/6] git rebase --abort ^(annulation du rebase en cours^)...
git rebase --abort 2>nul
REM nul output si pas de rebase en cours, c'est OK

echo [2/6] git fetch origin...
git fetch origin
if %errorlevel% neq 0 (
  echo ERROR: fetch failed
  pause
  exit /b 1
)

echo [3/6] git reset --hard origin/main ^(alignement avec le remote^)...
git reset --hard origin/main
if %errorlevel% neq 0 (
  echo ERROR: reset failed
  pause
  exit /b 1
)

echo [4/6] Copy pronostics.html ^(v27.3 locale^) par-dessus...
copy /Y "..\Paris-Sportif\deploy-v20\pronostics.html" "pronostics.html"
if %errorlevel% neq 0 (
  echo ERROR: copy pronostics.html failed
  pause
  exit /b 1
)

echo [5/6] Copy sw.js ^(v46^) par-dessus...
copy /Y "..\Paris-Sportif\deploy-v20\sw.js" "sw.js"
if %errorlevel% neq 0 (
  echo ERROR: copy sw.js failed
  pause
  exit /b 1
)

echo [6/6] Git add + commit + push...
git add pronostics.html sw.js
git commit -m "v27.3 Divergence amplifiee + polish (recovery after rebase conflict) — SW v46"
if %errorlevel% neq 0 (
  echo WARN: commit peut-etre vide. On tente le push quand meme.
)

git push origin main
if %errorlevel% neq 0 (
  echo.
  echo Premier push echoue - nouveau cron pendant la recovery. On retry 1 fois avec re-reset.
  git fetch origin
  git reset --hard origin/main
  copy /Y "..\Paris-Sportif\deploy-v20\pronostics.html" "pronostics.html"
  copy /Y "..\Paris-Sportif\deploy-v20\sw.js" "sw.js"
  git add pronostics.html sw.js
  git commit -m "v27.3 Divergence amplifiee + polish (recovery retry 2) — SW v46"
  git push origin main
  if %errorlevel% neq 0 (
    echo ERROR: push definitivement rejete. Relance ce .bat dans 30 secondes
    echo ou verifie sur GitHub que personne d'autre ne pousse.
    pause
    exit /b 1
  )
)

echo.
echo ============================================
echo   RECOVERY v27.3 REUSSIE
echo ============================================
echo.
echo SW v46 pushe. Forcer le refresh du SW cote navigateur :
echo.
echo navigator.serviceWorker.getRegistrations().then^(rs =^> Promise.all^(rs.map^(r =^> r.unregister^(^)^)^)^).then^(^(^) =^> caches.keys^(^)^).then^(k =^> Promise.all^(k.map^(c =^> caches.delete^(c^)^)^)^).then^(^(^) =^> location.reload^(true^)^);
echo.
pause
