# scripts/setup_winamax_task.ps1
# ============================================================
# Installe une tâche planifiée Windows qui lance
# scripts/import_winamax_account.py toutes les 6 heures.
#
# Avantage par rapport à un cron Linux :
#   - Tourne en mode utilisateur (pas besoin d'être admin)
#   - Démarre automatiquement après un reboot ou un Start When Available
#     si la machine était éteinte au moment prévu
#   - Coexiste avec n'importe quel autre logiciel Winamax / nav
#
# Usage :
#   1. Clic droit > "Exécuter avec PowerShell"
#   2. OU ouvrir PowerShell ici, puis :
#      .\scripts\setup_winamax_task.ps1
#
# Pour désinstaller :
#   .\scripts\setup_winamax_task.ps1 -Remove
#
# Pour changer la fréquence (par défaut 6h) :
#   .\scripts\setup_winamax_task.ps1 -IntervalHours 12
# ============================================================

param(
    [switch]$Remove = $false,
    [int]$IntervalHours = 6
)

$ErrorActionPreference = 'Stop'
$TaskName = 'Paris-Sportif Winamax Import'

# Trouve la racine du projet (le script vit dans /scripts/)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ImportScript = Join-Path $ScriptDir 'import_winamax_account.py'
$LogFile = Join-Path $ProjectRoot 'winamax_import.log'

if ($Remove) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host ""
        Write-Host "[OK] Tache supprimee : $TaskName" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[INFO] Aucune tache a supprimer (deja absente)." -ForegroundColor Yellow
    }
    Write-Host ""
    pause
    exit 0
}

# Vérifie que Python est dispo
$PythonExe = $null
foreach ($cmd in @('python', 'python3', 'py')) {
    try {
        $found = Get-Command $cmd -ErrorAction Stop
        $PythonExe = $found.Source
        break
    } catch { continue }
}
if (-not $PythonExe) {
    Write-Host ""
    Write-Host "[ERROR] Python introuvable. Installe Python d'abord (https://python.org)" -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Setup tache automatique Winamax Import" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Project root  : $ProjectRoot"
Write-Host "  Script        : $ImportScript"
Write-Host "  Python        : $PythonExe"
Write-Host "  Log file      : $LogFile"
Write-Host "  Cadence       : toutes les $IntervalHours heures"
Write-Host ""

if (-not (Test-Path $ImportScript)) {
    Write-Host "[ERROR] Script introuvable : $ImportScript" -ForegroundColor Red
    pause
    exit 1
}

# Pré-requis Python (best-effort, on n'echoue pas si pip absent)
Write-Host "Verification dependances Python..." -ForegroundColor Cyan
$Required = @('curl_cffi', 'beautifulsoup4', 'pywin32', 'pycryptodome')
foreach ($pkg in $Required) {
    $check = & $PythonExe -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('$($pkg.Replace("-","_").Replace("beautifulsoup4","bs4").Replace("pywin32","win32api").Replace("pycryptodome","Crypto"))') else 1)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  $pkg manquant - install..." -ForegroundColor Yellow
        & $PythonExe -m pip install $pkg --quiet --disable-pip-version-check 2>&1 | Out-Null
    } else {
        Write-Host "  $pkg OK" -ForegroundColor Green
    }
}

# Test de smoke : lance le script une fois pour verifier que ca marche
Write-Host ""
Write-Host "Test initial (dry run)..." -ForegroundColor Cyan
$testOutput = & $PythonExe $ImportScript 2>&1
$testCode = $LASTEXITCODE
Write-Host $testOutput
if ($testCode -ne 0) {
    Write-Host ""
    Write-Host "[WARN] Le test initial a retourne $testCode" -ForegroundColor Yellow
    Write-Host "       L'auto-extract a peut-etre echoue. Verifie que tu es" -ForegroundColor Yellow
    Write-Host "       connecte a winamax.fr dans Chrome (pour le DPAPI)." -ForegroundColor Yellow
    Write-Host "       La tache sera quand meme installee, elle reessayera" -ForegroundColor Yellow
    Write-Host "       toutes les $IntervalHours h." -ForegroundColor Yellow
    Write-Host ""
}

# Supprime l'ancienne tache si elle existe
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "Tache existante detectee, mise a jour..." -ForegroundColor Cyan
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Crée la nouvelle tâche
$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "`"$ImportScript`"" `
    -WorkingDirectory $ProjectRoot

$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
    -RepetitionInterval (New-TimeSpan -Hours $IntervalHours)
# v Windows >= 10 : RepetitionDuration optionnel ; on met 9999j pour "indefini"
$Trigger.Repetition.Duration = "P9999D"

$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -MultipleInstances IgnoreNew

$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -RunLevel Limited `
    -LogonType Interactive

Register-ScheduledTask -TaskName $TaskName `
    -Description "Importe l'historique de paris Winamax dans Paris-Sportif (cf docs/winamax-import.md)" `
    -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal | Out-Null

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Tache installee avec succes !" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Nom               : $TaskName"
Write-Host "  Premiere execution: dans 2 min"
Write-Host "  Repetition        : toutes les $IntervalHours h"
Write-Host ""
Write-Host "  Pour la voir       : taskschd.msc > Bibliotheque tache planifiee"
Write-Host "  Pour la desinstaller: .\scripts\setup_winamax_task.ps1 -Remove"
Write-Host "  Pour la lancer manuellement maintenant :"
Write-Host "    Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""

pause
