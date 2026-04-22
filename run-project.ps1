param(
    [switch]$NoInstall,
    [switch]$NoBackend,
    [switch]$NoFrontend,
    [switch]$ServicesOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts\start-local.ps1") `
    -NoInstall:$NoInstall `
    -NoBackend:$NoBackend `
    -NoFrontend:$NoFrontend `
    -ServicesOnly:$ServicesOnly

exit $LASTEXITCODE
