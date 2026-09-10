param(
  [string]$OpenFxRoot = "",
  [string]$NlohmannJsonRoot = "",
  [string]$Configuration = "Release",
  [string]$Generator = "Visual Studio 17 2022"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$buildRoot = Join-Path $projectRoot "dist\build\windows-x64"
$distRoot = Join-Path $projectRoot "dist\windows-x64"
$cargoTarget = Join-Path $buildRoot "cargo-target"

& node (Join-Path $projectRoot "tools\generate-parameter-contract.mjs")
if ($LASTEXITCODE -ne 0) { throw "Parameter contract generation failed with exit code $LASTEXITCODE." }
& node (Join-Path $projectRoot "companion\scripts\stage_frontend.mjs")
if ($LASTEXITCODE -ne 0) { throw "Companion frontend staging failed with exit code $LASTEXITCODE." }
$env:CARGO_TARGET_DIR = $cargoTarget
& cargo build --release --offline --manifest-path (Join-Path $projectRoot "companion\src-tauri\Cargo.toml")
if ($LASTEXITCODE -ne 0) { throw "Companion build failed with exit code $LASTEXITCODE." }

$cmakeArguments = @(
  "-S", $projectRoot, "-B", $buildRoot,
  "-G", $Generator, "-A", "x64",
  "-DBROKEN_FM_BUILD_OFX=ON", "-DBROKEN_FM_BUILD_TESTS=ON",
  "-DCMAKE_CUDA_ARCHITECTURES=75-real;86-real;89-real;89-virtual"
)
if ($OpenFxRoot) { $cmakeArguments += "-DOPENFX_ROOT=$OpenFxRoot" }
if ($NlohmannJsonRoot) { $cmakeArguments += "-DNLOHMANN_JSON_ROOT=$NlohmannJsonRoot" }
& cmake @cmakeArguments
if ($LASTEXITCODE -ne 0) { throw "CMake configuration failed with exit code $LASTEXITCODE." }
& cmake --build $buildRoot --config $Configuration --parallel 4
if ($LASTEXITCODE -ne 0) { throw "Native build failed with exit code $LASTEXITCODE." }
& ctest --test-dir $buildRoot -C $Configuration --output-on-failure
if ($LASTEXITCODE -ne 0) { throw "Native tests failed with exit code $LASTEXITCODE." }

if (Test-Path -LiteralPath $distRoot) { Remove-Item -LiteralPath $distRoot -Recurse -Force }
New-Item -ItemType Directory -Path $distRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $buildRoot "bundle\BrokenFM.ofx.bundle") -Destination $distRoot -Recurse
Copy-Item -LiteralPath (Join-Path $cargoTarget "release\broken-fm-companion.exe") -Destination (Join-Path $distRoot "BrokenFmCompanion.exe")
$manual = Join-Path $projectRoot "output\pdf\BROKEN_FM_USER_MANUAL_0.1.0.pdf"
if (-not (Test-Path -LiteralPath $manual)) { throw "User manual not found at $manual" }
Copy-Item -LiteralPath $manual -Destination (Join-Path $distRoot "BROKEN_FM_USER_MANUAL.pdf")
$cudaRuntime = Join-Path $env:CUDA_PATH "bin\cudart64_12.dll"
if (-not (Test-Path -LiteralPath $cudaRuntime)) { throw "CUDA runtime not found at $cudaRuntime" }
Copy-Item -LiteralPath $cudaRuntime -Destination (Join-Path $distRoot "BrokenFM.ofx.bundle\Contents\Win64\cudart64_12.dll")

$files = Get-ChildItem -LiteralPath $distRoot -File -Recurse | ForEach-Object {
  [ordered]@{
    path = $_.FullName.Substring($distRoot.Length + 1).Replace("\", "/")
    bytes = $_.Length
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}
[ordered]@{ product = "BROKEN FM"; version = "0.1.0"; files = @($files) } |
  ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $distRoot "manifest.json") -Encoding utf8
Write-Host "Staged $distRoot"
