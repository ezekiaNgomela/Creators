$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$runtimeDir = Join-Path $repoRoot ".runtime-bin"
$stateFile = Join-Path $runtimeDir "local-dev.json"

function Write-Step($Message) {
    Write-Host "[stop] $Message"
}

function Stop-Pid($PidValue, $Name) {
    if (-not $PidValue) {
        return
    }

    $process = Get-Process -Id $PidValue -ErrorAction SilentlyContinue
    if ($process) {
        Write-Step "stopping $Name pid=$PidValue"
        Stop-Process -Id $PidValue -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Path $stateFile) {
    $state = Get-Content $stateFile -Raw | ConvertFrom-Json
    Stop-Pid $state.frontend.pid "frontend"
    Stop-Pid $state.backend.pid "api"
    Stop-Pid $state.services.minio.pid "minio"
    Stop-Pid $state.services.redis.pid "redis"
}

$pgCtl = Get-Command pg_ctl.exe -ErrorAction SilentlyContinue
if (-not $pgCtl) {
    $pgCtl = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "bin\pg_ctl.exe" } |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1
}

$pgData = Join-Path $runtimeDir "postgres-data"
if ($pgCtl -and (Test-Path (Join-Path $pgData "PG_VERSION"))) {
    Write-Step "stopping Postgres"
    & $pgCtl -D $pgData stop -m fast | Out-Null
}

Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
Write-Step "local stack stopped"
