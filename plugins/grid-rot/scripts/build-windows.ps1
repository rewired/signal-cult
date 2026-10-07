param([string]$Configuration="Release",[string]$Generator="Visual Studio 17 2022",[switch]$CpuOnly)
$ErrorActionPreference="Stop"
$projectRoot=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$repositoryRoot=(Resolve-Path -LiteralPath (Join-Path $projectRoot "../..")).Path
$buildRoot=Join-Path $repositoryRoot "dist/build/windows-x64-grid-rot"
$distRoot=Join-Path $projectRoot "dist/windows-x64"
& node (Join-Path $projectRoot "companion/scripts/stage_frontend.mjs")
if($LASTEXITCODE -ne 0){throw "GRID ROT frontend staging failed."}
$cargoTarget=Join-Path $buildRoot "cargo-target"
$previousCargoTarget=$env:CARGO_TARGET_DIR
try{
 $env:CARGO_TARGET_DIR=$cargoTarget
 & cargo test --release --offline --manifest-path (Join-Path $projectRoot "companion/src-tauri/Cargo.toml")
 if($LASTEXITCODE -ne 0){throw "GRID ROT Companion tests failed."}
 & cargo build --release --offline --manifest-path (Join-Path $projectRoot "companion/src-tauri/Cargo.toml")
 if($LASTEXITCODE -ne 0){throw "GRID ROT Companion build failed."}
}finally{$env:CARGO_TARGET_DIR=$previousCargoTarget}
$arguments=@("-S",$repositoryRoot,"-B",$buildRoot,"-G",$Generator,"-A","x64","-DREWIRED_BUILD_BROKEN_FM=OFF","-DREWIRED_BUILD_CRT_SIM=OFF","-DREWIRED_BUILD_RASTER_RUPTURE=OFF","-DREWIRED_BUILD_GRID_ROT=ON","-DGRID_ROT_ENABLE_CUDA=$(if($CpuOnly){'OFF'}else{'ON'})")
if(-not $CpuOnly -and $env:CUDA_PATH){$arguments+=@("-T","cuda=$env:CUDA_PATH")}
& cmake @arguments;if($LASTEXITCODE -ne 0){throw "GRID ROT configuration failed."}
& cmake --build $buildRoot --config $Configuration --parallel 4;if($LASTEXITCODE -ne 0){throw "GRID ROT build failed."}
& ctest --test-dir $buildRoot -C $Configuration --output-on-failure;if($LASTEXITCODE -ne 0){throw "GRID ROT tests failed."}
New-Item -ItemType Directory -Path $distRoot -Force|Out-Null
Copy-Item -LiteralPath (Join-Path $buildRoot "bundle/GridRot.ofx.bundle") -Destination $distRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $cargoTarget "release/grid-rot-companion.exe") -Destination (Join-Path $distRoot "GridRotCompanion.exe") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "native/README.md") -Destination (Join-Path $distRoot "README.md") -Force
Write-Host "Staged $distRoot"