$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$tests = @(Get-ChildItem -LiteralPath (Join-Path $root "plugins") -Directory | ForEach-Object {
  $testDirectory = Join-Path $_.FullName "tests"
  if (Test-Path -LiteralPath $testDirectory) {
    Get-ChildItem -LiteralPath $testDirectory -Filter *.test.mjs -File | ForEach-Object { $_.FullName }
  }
})
& node --test @tests
if ($LASTEXITCODE -ne 0) { throw "Plugin JavaScript tests failed." }
