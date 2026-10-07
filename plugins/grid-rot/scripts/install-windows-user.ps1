param(
    [string]$Distribution = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if (-not $Distribution) {
    $Distribution = Join-Path $projectRoot "dist/windows-x64"
}
$Distribution = (Resolve-Path -LiteralPath $Distribution).Path

foreach ($processName in @("Resolve", "grid-rot-companion")) {
    if (Get-Process -Name $processName -ErrorAction SilentlyContinue) {
        throw "Close $processName before updating GRID ROT."
    }
}

$sourceBundle = Join-Path $Distribution "GridRot.ofx.bundle"
if (-not (Test-Path -LiteralPath $sourceBundle -PathType Container)) {
    throw "OFX bundle not found at $sourceBundle"
}

$sourceCompanion = Join-Path $Distribution "GridRotCompanion.exe"
if (-not (Test-Path -LiteralPath $sourceCompanion -PathType Leaf)) {
    throw "Companion not found at $sourceCompanion"
}

$userOfxRoot = Join-Path $env:LOCALAPPDATA "OFX/Plugins"
$appDestination = Join-Path $env:LOCALAPPDATA "Programs/GRID ROT"
$companionDestination = Join-Path $appDestination "GridRotCompanion.exe"

New-Item -ItemType Directory -Path $userOfxRoot, $appDestination -Force | Out-Null
Copy-Item -LiteralPath $sourceBundle -Destination $userOfxRoot -Recurse -Force
Copy-Item -LiteralPath $sourceCompanion -Destination $companionDestination -Force

$registryPath = "HKCU:\Software\rewired-vfx\GRID ROT"
New-Item -Path $registryPath -Force | Out-Null
Set-ItemProperty -Path $registryPath -Name CompanionPath -Value $companionDestination

$resolveSupport = Join-Path $env:APPDATA "Blackmagic Design/DaVinci Resolve/Support"
foreach ($cacheName in @("OFXPluginCache.xml", "OFXPluginCacheV2.xml")) {
    $cachePath = Join-Path $resolveSupport $cacheName
    if (Test-Path -LiteralPath $cachePath -PathType Leaf) {
        Remove-Item -LiteralPath $cachePath -Force
    }
}

$current = [Environment]::GetEnvironmentVariable("OFX_PLUGIN_PATH", "User")
$entries = @(
    $current -split ";" |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ }
)
if (-not ($entries | Where-Object { $_.TrimEnd("\") -ieq $userOfxRoot.TrimEnd("\") })) {
    $entries += $userOfxRoot
    [Environment]::SetEnvironmentVariable("OFX_PLUGIN_PATH", ($entries -join ";"), "User")
}

Write-Host "Installed GRID ROT OFX and Companion for the current user. Restart Resolve to rescan plug-ins."
