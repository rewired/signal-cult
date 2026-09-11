param(
  [ValidateSet("all", "broken-fm", "crt-sim", "raster-rupture")][string]$Plugin = "all",
  [switch]$CpuOnly,
  [string]$OpenFxRoot = "",
  [string]$NlohmannJsonRoot = "",
  [string]$Configuration = "Release",
  [string]$Generator = "Visual Studio 17 2022"
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if ($CpuOnly -and $Plugin -eq "broken-fm") { throw "BROKEN FM requires CUDA." }
$variant = if ($CpuOnly) { "$Plugin-cpu" } else { $Plugin }
$buildRoot = Join-Path $root "dist/build/windows-x64-$variant"
$fm = if (-not $CpuOnly -and $Plugin -in @("all", "broken-fm")) { "ON" } else { "OFF" }
$crt = if ($Plugin -in @("all", "crt-sim")) { "ON" } else { "OFF" }
$raster = if ($Plugin -in @("all", "raster-rupture")) { "ON" } else { "OFF" }
$cuda = if ($CpuOnly) { "OFF" } else { "ON" }
if ($fm -eq "ON") {
  & node (Join-Path $root "plugins/broken-fm/tools/generate-parameter-contract.mjs")
  if ($LASTEXITCODE -ne 0) { throw "BROKEN FM parameter generation failed." }
}
$arguments = @("-S", $root, "-B", $buildRoot, "-G", $Generator, "-A", "x64",
  "-DREWIRED_BUILD_BROKEN_FM=$fm", "-DREWIRED_BUILD_CRT_SIM=$crt", "-DREWIRED_BUILD_RASTER_RUPTURE=$raster",
  "-DCRT_ENABLE_CUDA=$cuda", "-DRASTER_RUPTURE_ENABLE_CUDA=$cuda")
if (-not $CpuOnly -and $env:CUDA_PATH) { $arguments += @("-T", "cuda=$env:CUDA_PATH") }
if ($OpenFxRoot) { $arguments += "-DOPENFX_ROOT=$OpenFxRoot" }
if ($NlohmannJsonRoot) { $arguments += "-DNLOHMANN_JSON_ROOT=$NlohmannJsonRoot" }
& cmake @arguments
if ($LASTEXITCODE -ne 0) { throw "Native configuration failed." }
& cmake --build $buildRoot --config $Configuration --parallel 4
if ($LASTEXITCODE -ne 0) { throw "Native build failed." }
& ctest --test-dir $buildRoot -C $Configuration --output-on-failure
if ($LASTEXITCODE -ne 0) { throw "Native tests failed." }
Write-Host "Native bundles: $buildRoot/bundle (not an installer)."
