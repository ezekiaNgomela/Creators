param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "run-project.ps1") -NoFrontend -NoOpen
exit $LASTEXITCODE
