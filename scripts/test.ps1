$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$tests = @(Get-ChildItem -LiteralPath (Join-Path $root "plugins/broken-fm/tests"), (Join-Path $root "plugins/crt-sim/tests") -Filter *.test.mjs -File | ForEach-Object { $_.FullName })
& node --test @tests
if ($LASTEXITCODE -ne 0) { throw "Plugin JavaScript tests failed." }
