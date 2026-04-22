param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Read-DotEnv($Path) {
    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if ($trimmed -eq "" -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
            continue
        }

        $parts = $trimmed.Split("=", 2)
        $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
    }
    return $values
}

$dotEnv = Read-DotEnv (Join-Path $repoRoot ".env")

function EnvValue($Name, $Fallback) {
    if ($dotEnv.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($dotEnv[$Name])) {
        return $dotEnv[$Name]
    }
    return $Fallback
}

$ports = @(
    [int](EnvValue "POSTGRES_PORT" "15432"),
    [int](EnvValue "REDIS_PORT" "16379"),
    [int](EnvValue "MINIO_API_PORT" "9000"),
    [int](EnvValue "MINIO_CONSOLE_PORT" "9001"),
    [int](EnvValue "API_PORT" "18000"),
    [int](EnvValue "WEB_PORT" "5173")
)

$listeners = Get-NetTCPConnection -State Listen -LocalPort $ports -ErrorAction SilentlyContinue
$processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($processId in $processIds) {
    if (-not $processId -or $processId -eq $PID) {
        continue
    }
    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        Stop-Process -Id $processId -Force -ErrorAction Stop
        Write-Host "[stop] $($process.ProcessName) pid=$processId"
    } catch {
        Write-Host "[warn] could not stop pid=${processId}: $($_.Exception.Message)"
    }
}

$workspace = (Resolve-Path $repoRoot).Path
$extra = Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -ne $PID -and
    $_.CommandLine -and
    $_.CommandLine.Contains($workspace) -and
    $_.Name -in @("node.exe", "cmd.exe", "creators-api.exe", "redis-server.exe", "minio.exe", "postgres.exe")
}

foreach ($process in $extra) {
    try {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        Write-Host "[stop] $($process.Name) pid=$($process.ProcessId)"
    } catch {
        Write-Host "[warn] could not stop pid=$($process.ProcessId): $($_.Exception.Message)"
    }
}
