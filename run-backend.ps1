param(
    [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts\start-local.ps1") `
    -NoInstall:$NoInstall `
    -NoFrontend

exit $LASTEXITCODE
