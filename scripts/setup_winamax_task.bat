@echo off
REM ============================================================
REM  Wrapper BAT pour setup_winamax_task.ps1
REM  Double-clique sur ce fichier pour installer la tache
REM  automatique d'import Winamax (toutes les 6h).
REM
REM  Pas besoin d'admin — la tache tourne en mode utilisateur.
REM ============================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_winamax_task.ps1" %*
