$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
Push-Location -LiteralPath (Join-Path $root "plugins")
try {
  Write-Host "rewired-vfx SIGNAL CULT"
  Write-Host "Menu:      http://localhost:8080/"
  Write-Host "BROKEN FM: http://localhost:8080/broken-fm/"
  Write-Host "CRT SIM:   http://localhost:8080/crt-sim/"
  Write-Host "SIGNAL ROT: http://localhost:8080/signal-rot/"
  Write-Host "BUCKET ROT: http://localhost:8080/bucket-rot/"
  Write-Host "GRID ROT:   http://localhost:8080/grid-rot/"
  Write-Host "RASTER RUPTURE: http://localhost:8080/raster-rupture/"
  & python -m http.server 8080 --bind 127.0.0.1
  if ($LASTEXITCODE -ne 0) { throw "Preview exited with code $LASTEXITCODE." }
} finally {
  Pop-Location
}
