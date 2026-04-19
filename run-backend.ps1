param(
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$runtimeDir = Join-Path $repoRoot ".runtime-bin"
$exePath = Join-Path $runtimeDir "devstack.exe"
$backendRoot = Join-Path $repoRoot "backend"

New-Item -ItemType Directory -Force $runtimeDir | Out-Null

if ((-not (Test-Path $exePath)) -or $Rebuild) {
    Write-Host "[build] backend devstack"
    Push-Location $backendRoot
    & go build -o $exePath ./devstack
    $buildExitCode = $LASTEXITCODE
    Pop-Location
    if ($buildExitCode -ne 0) {
        throw "go build failed with exit code $buildExitCode"
    }
} else {
    Write-Host "[run] using existing backend devstack"
}

Write-Host "[run] $exePath"
& $exePath
exit $LASTEXITCODE
