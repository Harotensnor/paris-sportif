@echo off
setlocal EnableDelayedExpansion
REM DEPLOY-V28.1 — FIX catalog + Winamax 1N2 odds :
REM   (A) Root cause du catalog vide depuis des jours : l'ancien fetch_winamax_catalog.py
REM       bouclait sur chaque tournoi (204 requetes x 0.4s) ce qui se faisait bloquer
REM       par Winamax sur les IPs GitHub Actions = 0 tournois extraits.
REM   (B) Refonte : l'index /paris-sportifs/sports/1 contient TOUT (tournois + matchs
REM       + cotes 1N2) dans PRELOADED_STATE. Un seul fetch (~2s), extrait 77 tournois,
REM       660 matchs avec cotes 1N2 propres. Genere a la fois winamax_catalog.json
REM       (pour patch_winamax) ET winamax_markets.json (pour patch_winamax_markets).
REM   (C) Workflow simplifie : fetch_winamax_catalog.py tourne a chaque tick (5 min),
REM       plus de fetch_winamax_markets.py separe. patch_winamax_markets.py reste.
REM   (D) Frontend _agentBestPick utilise maintenant les VRAIES cotes Winamax 1N2
REM       (dans wx.markets['1n2']) au lieu de la moyenne ESPN. O/U + BTTS pas encore
REM       car pas dans l'index — c'est un chantier futur.
REM   (E) Race-proof : reset hard + splice + retry jusqu'a 5x auto.

echo.
echo ============================================
echo   Deploy v28.10 - Ou performe si stale + Annuler reset (10 min) - SW v57
echo ============================================
echo.

REM Step 1: aller dans le fresh clone (ou le cloner si absent)
set "FRESH_DIR=C:\Users\bouln\Documents\Claude\Projects\paris-sportif-fresh"
if not exist "%FRESH_DIR%\.git" (
  echo paris-sportif-fresh absent - clone en cours...
  if not exist "C:\Users\bouln\Documents\Claude\Projects" (
    echo ERROR: le dossier C:\Users\bouln\Documents\Claude\Projects n'existe pas
    pause
    exit /b 1
  )
  cd /d "C:\Users\bouln\Documents\Claude\Projects"
  git clone https://github.com/Harotensnor/paris-sportif.git paris-sportif-fresh
  if %errorlevel% neq 0 (
    echo ERROR: git clone failed
    pause
    exit /b 1
  )
  cd /d "%FRESH_DIR%"
  git config user.email "theoboulnois@gmail.com"
  git config user.name "Harotensnor"
) else (
  cd /d "%FRESH_DIR%"
)

REM Step 2: annuler tout rebase/merge en cours (au cas ou le precedent deploy a planté)
git rebase --abort 2>nul
git merge --abort 2>nul

REM Step 3: boucle de retry jusqu'a 5 fois
set MAX_RETRY=5
set ATTEMPT=0

:RETRY_LOOP
set /a ATTEMPT+=1
echo.
echo ============================================
echo   Tentative %ATTEMPT% / %MAX_RETRY%
echo ============================================
echo.

echo [1/5] Fetch origin...
git fetch origin
if %errorlevel% neq 0 (
  echo ERROR: fetch failed
  if %ATTEMPT% LSS %MAX_RETRY% (
    echo Retry dans 3 secondes...
    timeout /t 3 /nobreak >nul
    goto RETRY_LOOP
  )
  pause
  exit /b 1
)

echo [2/5] Reset hard origin/main ^(on prend l'etat remote, puis on impose nos fichiers^)...
git reset --hard origin/main
if %errorlevel% neq 0 (
  echo ERROR: reset failed
  pause
  exit /b 1
)

echo [3/5] Splice ^(UI locale + PRONOSTICS_DATA remote fraiche^) + copy sw.js + backend v28...
node "..\Paris-Sportif\deploy-v20\splice-prono-data.js" "..\Paris-Sportif\deploy-v20\pronostics.html" "pronostics.html" "pronostics.html"
if %errorlevel% neq 0 (
  echo ERROR: splice failed ^(Node installe? Fallback copy.^)
  copy /Y "..\Paris-Sportif\deploy-v20\pronostics.html" "pronostics.html" >nul
)
copy /Y "..\Paris-Sportif\deploy-v20\sw.js" "sw.js" >nul
if %errorlevel% neq 0 (
  echo ERROR: copy sw.js failed
  pause
  exit /b 1
)
REM v28.1 — Copy backend files (catalog refondu + patch + workflow)
if not exist "scripts" mkdir scripts
if exist "..\Paris-Sportif\scripts\fetch_winamax_catalog.py" (
  copy /Y "..\Paris-Sportif\scripts\fetch_winamax_catalog.py" "scripts\fetch_winamax_catalog.py" >nul
)
if exist "..\Paris-Sportif\scripts\fetch_winamax_markets.py" (
  copy /Y "..\Paris-Sportif\scripts\fetch_winamax_markets.py" "scripts\fetch_winamax_markets.py" >nul
)
if exist "..\Paris-Sportif\scripts\patch_winamax_markets.py" (
  copy /Y "..\Paris-Sportif\scripts\patch_winamax_markets.py" "scripts\patch_winamax_markets.py" >nul
)
if exist "..\Paris-Sportif\.github\workflows\refresh.yml" (
  if not exist ".github\workflows" mkdir ".github\workflows"
  copy /Y "..\Paris-Sportif\.github\workflows\refresh.yml" ".github\workflows\refresh.yml" >nul
)

echo [4/5] Git commit...
git add pronostics.html sw.js
REM v28 — inclure les nouveaux fichiers backend s'ils ont ete copies
git add scripts/fetch_winamax_catalog.py scripts/fetch_winamax_markets.py scripts/patch_winamax_markets.py .github/workflows/refresh.yml 2>nul
git diff --cached --quiet
if %errorlevel% equ 0 (
  echo Rien a committer ^(fichiers identiques au remote^) — deploy inutile, on sort.
  goto END_OK
)
git commit -m "v28.10 Bug hunting continuous : (G) psArr 'Ou le modele performe' vide si _dataIsStale (les stats semaine sont basees sur historique mais user pense voir la semaine en cours, mieux vaut rien) (H) Reset undo fenetre 10 min : si user a clique Reinitialiser le modele dans les 10 dernieres minutes, un 2e clic sur la meme ligne ouvre une confirm 'Annuler le reset ?' qui supprime agentResetTs, restaurant la cagnotte historique complete. Evite la panique quand clic accidentel. Confirm principal ajoute mention 'Annulable 10 minutes apres' — SW v57 (tentative %ATTEMPT%)"
if %errorlevel% neq 0 (
  echo WARN: commit echoue — on tente quand meme le push.
)

echo [5/5] Git push origin main...
git push origin main
if %errorlevel% equ 0 (
  goto END_OK
)

echo.
echo Push rejete ^(probablement un cron-job concurrent^). Tentative %ATTEMPT%/%MAX_RETRY%.
if %ATTEMPT% LSS %MAX_RETRY% (
  echo Retry dans 2 secondes...
  timeout /t 2 /nobreak >nul
  goto RETRY_LOOP
)

echo.
echo ERROR: %MAX_RETRY% tentatives echouees. Verifie GitHub ^(peut-etre un bug ou un token expire^).
pause
exit /b 1

:END_OK
echo.
echo ============================================
echo   DEPLOY V28.10 REUSSI en %ATTEMPT% tentative^(s^)
echo ============================================
echo.
echo Backend: les scripts fetch_winamax_markets.py + patch_winamax_markets.py
echo sont dans scripts/, la workflow refresh.yml les appelle. Il faut aussi push
echo ces fichiers-la ^(ils sont dans le repo origin via ce meme commit auto^).
echo.
echo Prochaine etape: ouvre le site live, console F12,
echo tape "allow pasting", puis colle ce one-liner pour forcer SW v57 :
echo.
echo navigator.serviceWorker.getRegistrations().then^(rs =^> Promise.all^(rs.map^(r =^> r.unregister^(^)^)^)^).then^(^(^) =^> caches.keys^(^)^).then^(k =^> Promise.all^(k.map^(c =^> caches.delete^(c^)^)^)^).then^(^(^) =^> location.reload^(true^)^);
echo.
pause
