param(
  [string]$NlohmannJsonRoot = "",
  [string]$Configuration = "Release",
  [string]$Generator = "Visual Studio 17 2022",
  [string]$CargoTargetRoot = "",
  [switch]$CpuOnly
)
$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$buildRoot = Join-Path $projectRoot "dist/build/windows-x64"
$distRoot = Join-Path $projectRoot "dist/windows-x64"
if (-not $CargoTargetRoot) { $CargoTargetRoot = Join-Path $buildRoot "cargo-target" }
& node (Join-Path $projectRoot "companion/scripts/stage_frontend.mjs")
if ($LASTEXITCODE -ne 0) { throw "Frontend staging failed." }
$previousCargoTarget = $env:CARGO_TARGET_DIR
try {
  $env:CARGO_TARGET_DIR = $CargoTargetRoot
  & cargo test --release --offline --manifest-path (Join-Path $projectRoot "companion/src-tauri/Cargo.toml")
  if ($LASTEXITCODE -ne 0) { throw "Companion tests failed." }
  & cargo build --release --offline --manifest-path (Join-Path $projectRoot "companion/src-tauri/Cargo.toml")
  if ($LASTEXITCODE -ne 0) { throw "Companion build failed." }
} finally { $env:CARGO_TARGET_DIR = $previousCargoTarget }
$cuda = if ($CpuOnly) { "OFF" } else { "ON" }
$arguments = @("-S", $projectRoot, "-B", $buildRoot, "-G", $Generator, "-A", "x64", "-DCRT_ENABLE_CUDA=$cuda", "-DCRT_SIM_BUILD_OFX=ON", "-DCRT_SIM_BUILD_TESTS=ON")
if (-not $CpuOnly -and $env:CUDA_PATH) { $arguments += @("-T", "cuda=$env:CUDA_PATH") }
if ($NlohmannJsonRoot) { $arguments += "-DNLOHMANN_JSON_ROOT=$NlohmannJsonRoot" }
& cmake @arguments
if ($LASTEXITCODE -ne 0) { throw "Native configuration failed." }
& cmake --build $buildRoot --config $Configuration --parallel 4
if ($LASTEXITCODE -ne 0) { throw "Native build failed." }
& ctest --test-dir $buildRoot -C $Configuration --output-on-failure
if ($LASTEXITCODE -ne 0) { throw "Native tests failed." }
New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $buildRoot "bundle/RewiredCRT.ofx.bundle") -Destination $distRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $CargoTargetRoot "release/crt-sim-companion.exe") -Destination (Join-Path $distRoot "CrtSimCompanion.exe") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "native/README.md") -Destination (Join-Path $distRoot "README.md") -Force
$files = Get-ChildItem -LiteralPath $distRoot -File -Recurse | Where-Object Name -ne 'manifest.json' | ForEach-Object {
 [ordered]@{path=$_.FullName.Substring($distRoot.Length+1).Replace('\','/');bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant()}
}
[ordered]@{product='CRT SIM';version='0.7.0';files=@($files)} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $distRoot 'manifest.json') -Encoding utf8
Write-Host "Staged $distRoot"
