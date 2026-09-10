param([string]$Distribution = "")

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if (-not $Distribution) { $Distribution = Join-Path $projectRoot "dist\windows-x64" }
$Distribution = (Resolve-Path -LiteralPath $Distribution).Path

foreach ($processName in @("Resolve", "broken-fm-companion")) {
  if (Get-Process -Name $processName -ErrorAction SilentlyContinue) {
    throw "Close $processName before updating BROKEN FM."
  }
}

$sourceBundle = Join-Path $Distribution "BrokenFM.ofx.bundle"
$sourceCompanion = Join-Path $Distribution "BrokenFmCompanion.exe"
if (-not (Test-Path -LiteralPath $sourceBundle -PathType Container)) { throw "OFX bundle not found at $sourceBundle" }
if (-not (Test-Path -LiteralPath $sourceCompanion -PathType Leaf)) { throw "Companion not found at $sourceCompanion" }

$userOfxRoot = Join-Path $env:LOCALAPPDATA "OFX\Plugins"
$appDestination = Join-Path $env:LOCALAPPDATA "Programs\BROKEN FM"
$companionDestination = Join-Path $appDestination "BrokenFmCompanion.exe"

New-Item -ItemType Directory -Path $userOfxRoot, $appDestination -Force | Out-Null
Copy-Item -LiteralPath $sourceBundle -Destination $userOfxRoot -Recurse -Force
Copy-Item -LiteralPath $sourceCompanion -Destination $companionDestination -Force

New-Item -Path "HKCU:\Software\rewired-vfx\BROKEN FM" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\rewired-vfx\BROKEN FM" -Name CompanionPath -Value $companionDestination

$currentPluginPath = [Environment]::GetEnvironmentVariable("OFX_PLUGIN_PATH", "User")
$entries = @($currentPluginPath -split ";" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$alreadyPresent = $entries | Where-Object { $_.TrimEnd("\") -ieq $userOfxRoot.TrimEnd("\") }
if (-not $alreadyPresent) {
  $entries += $userOfxRoot
  [Environment]::SetEnvironmentVariable("OFX_PLUGIN_PATH", ($entries -join ";"), "User")
}

Write-Host "Installed BROKEN FM for the current user. Restart DaVinci Resolve to rescan plugins."
