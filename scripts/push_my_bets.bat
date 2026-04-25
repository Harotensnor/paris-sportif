@echo off
REM ============================================================
REM  Lance import + commit + push winamax_my_bets.json
REM
REM  Utile apres avoir rafraichi tes paris pour que le site
REM  GitHub Pages reflete les derniers chiffres.
REM
REM  Usage : double-clic sur ce fichier
REM ============================================================
cd /d "%~dp0\.."
echo.
echo [1/3] Import depuis Winamax...
python scripts\import_winamax_account.py
if errorlevel 1 (
    echo.
    echo ERREUR: limport a echoue. Voir winamax_import.log
    pause
    exit /b 1
)

echo.
echo [2/3] Commit du fichier winamax_my_bets.json...
git add winamax_my_bets.json
git diff --cached --quiet
if not errorlevel 1 (
    echo Aucun changement a commit (les paris sont deja a jour).
    pause
    exit /b 0
)

git commit -m "data: update my Winamax bets %DATE% %TIME%"
if errorlevel 1 (
    echo ERREUR: commit failed
    pause
    exit /b 2
)

echo.
echo [3/3] Push vers GitHub...
git push
if errorlevel 1 (
    echo ERREUR: push failed (config git ?)
    pause
    exit /b 3
)

echo.
echo OK ! Tes paris sont a jour sur le site deploye.
echo Le site va se reconstruire automatiquement (~1 min).
echo.
pause
