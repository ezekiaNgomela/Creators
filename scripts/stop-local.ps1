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
    Stop-Pid $state.services.postgres.pid "postgres"
}

$knownRoots = @($runtimeDir, (Join-Path $repoRoot "apps\web"))
$orphanProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        if ($_.ProcessId -eq $PID -or [string]::IsNullOrWhiteSpace($_.CommandLine)) {
            return $false
        }
        foreach ($root in $knownRoots) {
            if ($_.CommandLine -like "*$root*") {
                return $true
            }
        }
        return $false
    }

foreach ($process in $orphanProcesses) {
    Write-Step "stopping orphan $($process.Name) pid=$($process.ProcessId)"
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
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
if ($pgCtl -and (Test-Path (Join-Path $pgData "postmaster.pid"))) {
    Write-Step "stopping Postgres"
    & $pgCtl -D $pgData stop -m fast 2>$null | Out-Null
}

$listener = Get-NetTCPConnection -State Listen -LocalPort 15432 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -like "*$pgData*") {
        Write-Step "stopping Postgres listener pid=$($listener.OwningProcess)"
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
Write-Step "local stack stopped"
