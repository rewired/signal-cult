param(
  [string]$Configuration = "Release",
  [string]$Generator = "Visual Studio 17 2022",
  [switch]$CpuOnly
)
$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot "../..")).Path
$buildRoot = Join-Path $repositoryRoot "dist/build/windows-x64-raster-rupture"
$distRoot = Join-Path $projectRoot "dist/windows-x64"
$arguments = @("-S",$repositoryRoot,"-B",$buildRoot,"-G",$Generator,"-A","x64","-DREWIRED_BUILD_BROKEN_FM=OFF","-DREWIRED_BUILD_CRT_SIM=OFF","-DREWIRED_BUILD_RASTER_RUPTURE=ON","-DRASTER_RUPTURE_ENABLE_CUDA=$(if($CpuOnly){'OFF'}else{'ON'})")
if (-not $CpuOnly -and $env:CUDA_PATH) { $arguments += @("-T", "cuda=$env:CUDA_PATH") }
& cmake @arguments
if ($LASTEXITCODE -ne 0) { throw "Raster Rupture configuration failed." }
& cmake --build $buildRoot --config $Configuration --parallel 4
if ($LASTEXITCODE -ne 0) { throw "Raster Rupture build failed." }
& ctest --test-dir $buildRoot -C $Configuration --output-on-failure
if ($LASTEXITCODE -ne 0) { throw "Raster Rupture tests failed." }
New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $buildRoot "bundle/RasterRupture.ofx.bundle") -Destination $distRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "native/README.md") -Destination (Join-Path $distRoot "README.md") -Force
Write-Host "Staged $distRoot"
