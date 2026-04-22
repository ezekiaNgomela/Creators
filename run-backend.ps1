param(
    [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $repoRoot "scripts\start-local.ps1"), "-NoFrontend")
if ($NoInstall) { $arguments += "-NoInstall" }

& powershell @arguments

exit $LASTEXITCODE
