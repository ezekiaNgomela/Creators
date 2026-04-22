param(
    [switch]$NoInstall,
    [switch]$NoBackend,
    [switch]$NoFrontend,
    [switch]$ServicesOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $repoRoot "scripts\start-local.ps1"))
if ($NoInstall) { $arguments += "-NoInstall" }
if ($NoBackend) { $arguments += "-NoBackend" }
if ($NoFrontend) { $arguments += "-NoFrontend" }
if ($ServicesOnly) { $arguments += "-ServicesOnly" }

& powershell @arguments

exit $LASTEXITCODE
