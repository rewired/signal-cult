param([string]$Distribution = "")
$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if (-not $Distribution) { $Distribution = Join-Path $projectRoot "dist/windows-x64" }
$Distribution = (Resolve-Path -LiteralPath $Distribution).Path
if (Get-Process -Name "Resolve" -ErrorAction SilentlyContinue) { throw "Close DaVinci Resolve before updating RASTER RUPTURE." }
$sourceBundle = Join-Path $Distribution "RasterRupture.ofx.bundle"
if (-not (Test-Path -LiteralPath $sourceBundle -PathType Container)) { throw "OFX bundle not found at $sourceBundle" }
$userOfxRoot = Join-Path $env:LOCALAPPDATA "OFX/Plugins"
New-Item -ItemType Directory -Path $userOfxRoot -Force | Out-Null
Copy-Item -LiteralPath $sourceBundle -Destination $userOfxRoot -Recurse -Force
$resolveSupport = Join-Path $env:APPDATA "Blackmagic Design\DaVinci Resolve\Support"
foreach ($cacheName in @("OFXPluginCache.xml", "OFXPluginCacheV2.xml")) {
  $cachePath = Join-Path $resolveSupport $cacheName
  if (Test-Path -LiteralPath $cachePath -PathType Leaf) { Remove-Item -LiteralPath $cachePath -Force }
}
$current = [Environment]::GetEnvironmentVariable("OFX_PLUGIN_PATH", "User")
$entries = @($current -split ";" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (-not ($entries | Where-Object { $_.TrimEnd("\") -ieq $userOfxRoot.TrimEnd("\") })) { $entries += $userOfxRoot; [Environment]::SetEnvironmentVariable("OFX_PLUGIN_PATH", ($entries -join ";"), "User") }
Write-Host "Installed RASTER RUPTURE for the current user and cleared Resolve's generated OFX cache. Restart DaVinci Resolve to rescan plugins."
