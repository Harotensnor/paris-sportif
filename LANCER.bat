@echo off
chcp 65001 >nul
title Pronostics Sportifs
cd /d "%~dp0"

REM Essayer python, puis py, puis py -3
where python >nul 2>&1
if %ERRORLEVEL%==0 (
    python serveur.py
    goto fin
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
    py -3 serveur.py
    goto fin
)

echo.
echo ================================================================
echo   Python n'est pas installe sur ce PC.
echo ================================================================
echo.
echo   Deux options :
echo.
echo   1. Installer Python (facile, 2 minutes) :
echo      https://www.python.org/downloads/
echo      IMPORTANT : cocher "Add Python to PATH" a l'installation.
echo.
echo   2. Ouvrir pronostics.html directement dans FIREFOX
echo      (Firefox autorise le file:// -^> ESPN, contrairement a Chrome).
echo.
echo ================================================================
pause

:fin
