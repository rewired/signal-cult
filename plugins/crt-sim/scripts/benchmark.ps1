param(
  [string]$BuildRoot = "",
  [switch]$Cuda,
  [switch]$WriteReport
)
$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if (-not $BuildRoot) { $BuildRoot = Join-Path $projectRoot "native/build" }
$exe = Join-Path $BuildRoot "Release/crt_benchmark.exe"
if (-not (Test-Path -LiteralPath $exe)) { throw "Benchmark executable not found: $exe" }
$rows = [System.Collections.Generic.List[string]]::new()
$rows.Add("| Backend | Resolution | Profile | Frames | ms/frame | fps |")
$rows.Add("| --- | ---: | --- | ---: | ---: | ---: |")
$cases = @(
  @(1920,1080,"default",2),
  @(3840,2160,"default",1),
  @(1920,1080,"max",2),
  @(3840,2160,"max",1)
)
$backends = @("cpu")
if ($Cuda) { $backends += "cuda" }
foreach ($backend in $backends) {
  foreach ($case in $cases) {
    $frames = if ($backend -eq "cuda") { [Math]::Max(30, $case[3] * 30) } else { $case[3] }
    $line = & $exe $case[0] $case[1] $case[2] $frames $backend
    if ($LASTEXITCODE -ne 0) { throw "Benchmark failed: $backend $($case[0])x$($case[1]) $($case[2])" }
    $rows.Add($line)
    Write-Host $line
  }
}
if ($WriteReport) {
  $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name).Trim()
  $gpu = (Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ", "
  $reportLines = @(
    "# CRT SIM R&D performance matrix",
    "",
    "Measured locally on $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'). These are standalone core-renderer measurements, not in-host Resolve timings.",
    "",
    "- CPU: $cpu",
    "- GPU: $gpu",
    "- Build: Release",
    ""
  )
  $reportLines += $rows.ToArray()
  $report = $reportLines -join [Environment]::NewLine
  Set-Content -LiteralPath (Join-Path $projectRoot "docs/performance-results.md") -Value $report -Encoding utf8
}
