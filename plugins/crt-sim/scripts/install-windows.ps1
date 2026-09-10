param([string]$Distribution = "")

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if (-not $Distribution) { $Distribution = Join-Path $projectRoot "dist\windows-x64" }
$Distribution = (Resolve-Path -LiteralPath $Distribution).Path
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script from an elevated PowerShell session."
}
$ofxDestination = Join-Path $env:CommonProgramFiles "OFX\Plugins\RewiredCRT.ofx.bundle"
$appDestination = Join-Path $env:ProgramFiles "CRT SIM"
New-Item -ItemType Directory -Path (Split-Path $ofxDestination), $appDestination -Force | Out-Null
foreach ($name in @("Resolve", "crt-sim-companion")) { if (Get-Process -Name $name -ErrorAction SilentlyContinue) { throw "Close $name before updating CRT SIM." } }
foreach ($name in @("RewiredCRT.ofx.bundle/Contents/Win64/RewiredCRT.ofx", "CrtSimCompanion.exe")) { if (-not (Test-Path -LiteralPath (Join-Path $Distribution $name))) { throw "Package is incomplete: $name" } }
Copy-Item -LiteralPath (Join-Path $Distribution "RewiredCRT.ofx.bundle") -Destination (Split-Path $ofxDestination) -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Distribution "CrtSimCompanion.exe") -Destination $appDestination -Force
New-Item -Path "HKCU:\Software\rewired-vfx\CRT SIM" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\rewired-vfx\CRT SIM" -Name CompanionPath -Value (Join-Path $appDestination "CrtSimCompanion.exe")
Write-Host "Installed CRT SIM OFX and Companion. Restart DaVinci Resolve to rescan plugins."
