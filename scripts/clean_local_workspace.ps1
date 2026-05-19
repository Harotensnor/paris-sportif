param(
  [switch]$Execute,
  [switch]$PruneGit,
  [int]$KeepInstallers = 1
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Mode = if ($Execute) { "CLEAN" } else { "DRY-RUN" }

function Resolve-InRepo {
  param([string]$Path)
  $candidate = Join-Path $Root $Path
  if (-not (Test-Path -LiteralPath $candidate)) { return $null }
  $resolved = (Resolve-Path -LiteralPath $candidate).Path
  if (-not $resolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refus de nettoyer hors projet: $resolved"
  }
  return $resolved
}

function Get-SizeMb {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return 0 }
  $item = Get-Item -LiteralPath $Path -Force
  if ($item.PSIsContainer) {
    $sum = (Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    return [math]::Round(($sum / 1MB), 1)
  }
  return [math]::Round(($item.Length / 1MB), 1)
}

function Test-GitTracked {
  param([string]$AbsolutePath)
  if (-not $AbsolutePath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Chemin hors projet: $AbsolutePath"
  }
  $relative = $AbsolutePath.Substring($Root.Length).TrimStart("\", "/").Replace("\", "/")
  $out = @(git -C $Root ls-files -- "$relative" 2>$null)
  return $out.Count -gt 0
}

function Remove-Safe {
  param([string]$AbsolutePath, [string]$Reason)
  if (-not (Test-Path -LiteralPath $AbsolutePath)) { return }
  if (Test-GitTracked $AbsolutePath) {
    Write-Host "SKIP tracked: $AbsolutePath"
    return
  }
  $mb = Get-SizeMb $AbsolutePath
  Write-Host "$Mode $mb MB :: $Reason :: $AbsolutePath"
  if ($Execute) {
    Remove-Item -LiteralPath $AbsolutePath -Recurse -Force
  }
}

Write-Host "Paris-Sportif local cleanup ($Mode)"
Write-Host "Root: $Root"
Write-Host ""

$safeDirs = @(
  @{ Path = ".cache"; Reason = "cache sources externes regenerable" },
  @{ Path = "playwright-report"; Reason = "rapport Playwright regenerable" },
  @{ Path = "test-results"; Reason = "resultats de tests regenerables" },
  @{ Path = ".pytest_cache"; Reason = "cache pytest regenerable" },
  @{ Path = "desktop/dist/win-unpacked"; Reason = "build unpacked Electron regenerable" }
)

foreach ($target in $safeDirs) {
  $resolved = Resolve-InRepo $target.Path
  if ($resolved) { Remove-Safe $resolved $target.Reason }
}

$dist = Resolve-InRepo "desktop/dist"
if ($dist) {
  $installers = Get-ChildItem -LiteralPath $dist -File -Filter "*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  $keep = @($installers | Select-Object -First ([math]::Max(0, $KeepInstallers)))
  $keepNames = New-Object System.Collections.Generic.HashSet[string]
  foreach ($file in $keep) {
    [void]$keepNames.Add($file.Name)
    [void]$keepNames.Add("$($file.Name).blockmap")
  }
  foreach ($file in $installers) {
    if (-not $keepNames.Contains($file.Name)) {
      Remove-Safe $file.FullName "ancien installateur Electron"
      $blockmap = "$($file.FullName).blockmap"
      if (Test-Path -LiteralPath $blockmap) {
        Remove-Safe $blockmap "ancienne blockmap Electron"
      }
    }
  }
  Get-ChildItem -LiteralPath $dist -File -Filter "builder-debug.yml" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Safe $_.FullName "debug electron-builder regenerable"
  }
  Get-ChildItem -LiteralPath $dist -File -Filter "builder-effective-config.yaml" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Safe $_.FullName "config effective electron-builder regenerable"
  }
}

if ($PruneGit) {
  Write-Host ""
  Write-Host "$Mode Git maintenance: gc/prune"
  if ($Execute) {
    git -C $Root reflog expire --expire=now --expire-unreachable=now --all
    git -C $Root gc --prune=now
    git -C $Root count-objects -vH
  } else {
    Write-Host "DRY-RUN would run: git reflog expire --expire=now --expire-unreachable=now --all"
    Write-Host "DRY-RUN would run: git gc --prune=now"
  }
}

Write-Host ""
Write-Host "Termine. Relance sans -Execute pour previsualiser, avec -Execute pour nettoyer."
