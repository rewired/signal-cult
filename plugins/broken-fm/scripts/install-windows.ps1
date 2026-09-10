param([string]$Distribution = "")

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if (-not $Distribution) { $Distribution = Join-Path $projectRoot "dist\windows-x64" }
$Distribution = (Resolve-Path -LiteralPath $Distribution).Path
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script from an elevated PowerShell session."
}
$ofxDestination = Join-Path $env:CommonProgramFiles "OFX\Plugins\BrokenFM.ofx.bundle"
$appDestination = Join-Path $env:ProgramFiles "BROKEN FM"
New-Item -ItemType Directory -Path (Split-Path $ofxDestination), $appDestination -Force | Out-Null
if (Test-Path -LiteralPath $ofxDestination) { Remove-Item -LiteralPath $ofxDestination -Recurse -Force }
Copy-Item -LiteralPath (Join-Path $Distribution "BrokenFM.ofx.bundle") -Destination $ofxDestination -Recurse
Copy-Item -LiteralPath (Join-Path $Distribution "BrokenFmCompanion.exe") -Destination $appDestination -Force
New-Item -Path "HKCU:\Software\rewired-vfx\BROKEN FM" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\rewired-vfx\BROKEN FM" -Name CompanionPath -Value (Join-Path $appDestination "BrokenFmCompanion.exe")
Write-Host "Installed BROKEN FM OFX and Companion. Restart DaVinci Resolve to rescan plugins."
