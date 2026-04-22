param(
    [switch]$NoInstall,
    [switch]$NoBackend,
    [switch]$NoFrontend,
    [switch]$ServicesOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$runtimeDir = Join-Path $repoRoot ".runtime-bin"
$toolsDir = Join-Path $runtimeDir "tools"
$downloadsDir = Join-Path $runtimeDir "downloads"
$logDir = Join-Path $runtimeDir "logs"
$stateFile = Join-Path $runtimeDir "local-dev.json"
$stageFile = Join-Path $logDir "start-local.stage.log"

New-Item -ItemType Directory -Force $runtimeDir, $toolsDir, $downloadsDir, $logDir | Out-Null
Remove-Item -LiteralPath $stageFile -Force -ErrorAction SilentlyContinue

function Write-Step($Message) {
    Write-Host "[run] $Message"
}

function Write-Ready($Message) {
    Write-Host "[ready] $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
    Write-Host "[warn] $Message" -ForegroundColor Yellow
}

function Write-Stage($Message) {
    $line = "{0} {1}" -f (Get-Date).ToString("o"), $Message
    Add-Content -LiteralPath $stageFile -Value $line
}

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
    $current = [Environment]::GetEnvironmentVariable($Name, "Process")
    if (-not [string]::IsNullOrWhiteSpace($current)) {
        return $current
    }
    if ($dotEnv.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($dotEnv[$Name])) {
        return $dotEnv[$Name]
    }
    return $Fallback
}

function Set-ProcessEnv($Name, $Value) {
    [Environment]::SetEnvironmentVariable($Name, [string]$Value, "Process")
}

function Get-PostgresTool($Name) {
    $command = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $roots = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending
    foreach ($root in $roots) {
        $candidate = Join-Path $root.FullName "bin\$Name.exe"
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "Postgres tool '$Name.exe' was not found. Install PostgreSQL locally, then run this again."
}

function Download-File($Url, $OutputPath) {
    if (Test-Path $OutputPath) {
        return
    }

    Write-Step "downloading $Url"
    Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
}

function Install-Redis {
    $redisServer = Get-ChildItem (Join-Path $toolsDir "redis") -Recurse -Filter "redis-server.exe" -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($redisServer) {
        return $redisServer.FullName
    }

    if ($NoInstall) {
        throw "Redis is not installed in .runtime-bin/tools/redis and -NoInstall was passed."
    }

    $zipPath = Join-Path $downloadsDir "redis-windows-5.0.14.1.zip"
    $redisRoot = Join-Path $toolsDir "redis"
    Download-File "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip" $zipPath
    New-Item -ItemType Directory -Force $redisRoot | Out-Null
    Expand-Archive -LiteralPath $zipPath -DestinationPath $redisRoot -Force

    $redisServer = Get-ChildItem $redisRoot -Recurse -Filter "redis-server.exe" |
        Select-Object -First 1
    if (-not $redisServer) {
        throw "Redis download completed, but redis-server.exe was not found."
    }
    return $redisServer.FullName
}

function Install-MinIO {
    $minioRoot = Join-Path $toolsDir "minio"
    $minioExe = Join-Path $minioRoot "minio.exe"
    if (Test-Path $minioExe) {
        return $minioExe
    }

    if ($NoInstall) {
        throw "MinIO is not installed in .runtime-bin/tools/minio and -NoInstall was passed."
    }

    New-Item -ItemType Directory -Force $minioRoot | Out-Null
    Download-File "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" $minioExe
    return $minioExe
}

function Test-Tcp($HostName, [int]$Port, [int]$TimeoutMs = 500) {
    $client = New-Object Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Wait-Tcp($Name, $HostName, [int]$Port, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if (Test-Tcp $HostName $Port 700) {
            Write-Ready "$Name is listening on ${HostName}:${Port}"
            return
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)

    throw "$Name did not start on ${HostName}:${Port}"
}

function Wait-Http($Name, $Url, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
            Write-Ready "$Name is available at $Url"
            return
        } catch {
            Start-Sleep -Seconds 1
        }
    } while ((Get-Date) -lt $deadline)

    throw "$Name did not answer at $Url"
}

function Wait-PostgresSql($PsqlPath, [int]$Port, $User, $Password, [int]$TimeoutSeconds) {
    $oldPassword = $env:PGPASSWORD
    $env:PGPASSWORD = $Password
    try {
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        do {
            $output = & $PsqlPath -w -h 127.0.0.1 -p $Port -U $User -d postgres -tAc "SELECT 1" 2>$null
            if ($LASTEXITCODE -eq 0 -and ([string]($output | Select-Object -First 1)).Trim() -eq "1") {
                Write-Ready "Postgres accepts SQL connections"
                return
            }
            Start-Sleep -Seconds 1
        } while ((Get-Date) -lt $deadline)
    } finally {
        $env:PGPASSWORD = $oldPassword
    }

    throw "Postgres did not accept SQL connections within $TimeoutSeconds seconds"
}

function Stop-LocalProcesses {
    $knownRoots = @($runtimeDir, (Join-Path $repoRoot "apps\web"))
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $line = $_.CommandLine
            if ([string]::IsNullOrWhiteSpace($line)) {
                return $false
            }
            foreach ($root in $knownRoots) {
                if ($line -like "*$root*") {
                    return $true
                }
            }
            return $false
        }

    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
            Write-Warn "stopped old local process $($process.Name) pid=$($process.ProcessId)"
        } catch {
            Write-Warn "could not stop pid=$($process.ProcessId): $($_.Exception.Message)"
        }
    }
}

function Assert-PortFree($Port, $Name) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $listener) {
        return
    }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    $description = if ($process) { "$($process.Name) pid=$($process.ProcessId)" } else { "pid=$($listener.OwningProcess)" }
    throw "$Name port $Port is already in use by $description"
}

function Start-LoggedProcess($Name, $FilePath, [string[]]$Arguments, $WorkingDirectory) {
    $stdout = Join-Path $logDir "$Name.out.log"
    $stderr = Join-Path $logDir "$Name.err.log"
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue

    $process = Start-Process -FilePath $FilePath `
        -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    Write-Step "started $Name pid=$($process.Id)"
    return $process
}

function Start-Postgres {
    Write-Stage "postgres:start"
    $pgPort = [int](EnvValue "POSTGRES_PORT" "15432")
    $pgDb = EnvValue "POSTGRES_DB" "creators"
    $pgUser = EnvValue "POSTGRES_USER" "postgres"
    $pgPassword = EnvValue "POSTGRES_PASSWORD" "postgres"
    $pgData = Join-Path $runtimeDir "postgres-data"
    $pgLog = Join-Path $logDir "postgres.log"
    $initdb = Get-PostgresTool "initdb"
    $postgres = Get-PostgresTool "postgres"
    $psql = Get-PostgresTool "psql"

    if (-not (Test-Path (Join-Path $pgData "PG_VERSION"))) {
        if ((Test-Path $pgData) -and ((Get-ChildItem $pgData -Force | Measure-Object).Count -gt 0)) {
            throw "$pgData exists but is not a Postgres data directory."
        }

        Write-Step "initializing local Postgres data"
        New-Item -ItemType Directory -Force $pgData | Out-Null
        $pwFile = Join-Path $runtimeDir "postgres.pw"
        Set-Content -LiteralPath $pwFile -Value $pgPassword -NoNewline
        & $initdb -D $pgData -U $pgUser --pwfile=$pwFile --auth=scram-sha-256 --encoding=UTF8 | Tee-Object -FilePath $pgLog
        if ($LASTEXITCODE -ne 0) {
            throw "initdb failed with exit code $LASTEXITCODE"
        }
    }

    Write-Stage "postgres:start-server"
    $process = $null
    if (-not (Test-Tcp "127.0.0.1" $pgPort 500)) {
        Write-Step "starting local Postgres"
        $process = Start-LoggedProcess "postgres" $postgres @("-D", $pgData, "-p", "$pgPort", "-h", "127.0.0.1") $repoRoot
    }

    Write-Stage "postgres:wait"
    Wait-Tcp "Postgres" "127.0.0.1" $pgPort 30
    Start-Sleep -Seconds 5

    Write-Stage "postgres:ensure-db"
    $oldPassword = $env:PGPASSWORD
    $env:PGPASSWORD = $pgPassword
    try {
        $existsOutput = & $psql -w -h 127.0.0.1 -p $pgPort -U $pgUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$pgDb'"
        if ($LASTEXITCODE -ne 0) {
            throw "psql database check failed with exit code $LASTEXITCODE"
        }
        $exists = ([string]($existsOutput | Select-Object -First 1)).Trim()
        if ($exists -ne "1") {
            Write-Step "creating Postgres database $pgDb"
            & $psql -w -h 127.0.0.1 -p $pgPort -U $pgUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE `"$pgDb`""
            if ($LASTEXITCODE -ne 0) {
                throw "database creation failed with exit code $LASTEXITCODE"
            }
        }
    } finally {
        $env:PGPASSWORD = $oldPassword
    }

    Write-Stage "postgres:done"
    return @{
        Url = "postgres://$pgUser`:$pgPassword@127.0.0.1:$pgPort/$pgDb`?sslmode=disable"
        Port = $pgPort
        Process = $process
    }
}

function Start-Redis {
    Write-Stage "redis:start"
    $redisPort = [int](EnvValue "REDIS_PORT" "16379")
    Assert-PortFree $redisPort "Redis"

    $redisServer = Install-Redis
    $redisData = Join-Path $runtimeDir "redis-data"
    New-Item -ItemType Directory -Force $redisData | Out-Null

    $redisConf = Join-Path $runtimeDir "redis.conf"
    @(
        "bind 127.0.0.1"
        "port $redisPort"
        "dir $($redisData.Replace('\', '/'))"
        "save `"`""
        "appendonly no"
    ) | Set-Content -LiteralPath $redisConf

    $process = Start-LoggedProcess "redis" $redisServer @($redisConf) $runtimeDir
    Wait-Tcp "Redis" "127.0.0.1" $redisPort 20
    Write-Stage "redis:done"
    return @{
        Url = "redis://127.0.0.1:$redisPort/0"
        Port = $redisPort
        Process = $process
    }
}

function Start-MinIO {
    Write-Stage "minio:start"
    $apiPort = [int](EnvValue "MINIO_API_PORT" "9000")
    $consolePort = [int](EnvValue "MINIO_CONSOLE_PORT" "9001")
    $rootUser = EnvValue "MINIO_ROOT_USER" "minioadmin"
    $rootPassword = EnvValue "MINIO_ROOT_PASSWORD" "minioadmin"
    Assert-PortFree $apiPort "MinIO API"
    Assert-PortFree $consolePort "MinIO console"

    $minioExe = Install-MinIO
    $minioData = Join-Path $runtimeDir "minio-data"
    New-Item -ItemType Directory -Force $minioData | Out-Null

    Set-ProcessEnv "MINIO_ROOT_USER" $rootUser
    Set-ProcessEnv "MINIO_ROOT_PASSWORD" $rootPassword

    $process = Start-LoggedProcess "minio" $minioExe @(
        "server",
        $minioData,
        "--address",
        "127.0.0.1:$apiPort",
        "--console-address",
        "127.0.0.1:$consolePort"
    ) $runtimeDir

    $healthUrl = "http://127.0.0.1:$apiPort/minio/health/live"
    Wait-Http "MinIO" $healthUrl 45
    Write-Stage "minio:done"
    return @{
        HealthUrl = $healthUrl
        ConsoleUrl = "http://127.0.0.1:$consolePort"
        Process = $process
    }
}

function Start-Backend {
    param($PostgresUrl, $RedisUrl, $MinioHealthUrl)

    Write-Stage "backend:start"
    $apiPort = [int](EnvValue "API_PORT" "18000")
    Assert-PortFree $apiPort "API"

    $apiRoot = Join-Path $repoRoot "apps\api"
    $apiExe = Join-Path $runtimeDir "creators-api.exe"

    Write-Step "building Go API"
    Push-Location $apiRoot
    try {
        go build -o $apiExe .
        if ($LASTEXITCODE -ne 0) {
            throw "go build failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }

    Set-ProcessEnv "APP_PORT" $apiPort
    Set-ProcessEnv "POSTGRES_URL" $PostgresUrl
    Set-ProcessEnv "DATABASE_URL" $PostgresUrl
    Set-ProcessEnv "REDIS_URL" $RedisUrl
    Set-ProcessEnv "MINIO_HEALTH_URL" $MinioHealthUrl
    Set-ProcessEnv "FRONTEND_ORIGIN" "http://localhost:$(EnvValue "WEB_PORT" "5173")"

    $process = Start-LoggedProcess "api" $apiExe @() $repoRoot
    $healthUrl = "http://127.0.0.1:$apiPort/api/health"
    Wait-Http "API" $healthUrl 20
    Write-Stage "backend:done"
    return @{
        HealthUrl = $healthUrl
        Process = $process
    }
}

function Start-Frontend {
    Write-Stage "frontend:start"
    $webPort = [int](EnvValue "WEB_PORT" "5173")
    Assert-PortFree $webPort "Expo web"

    $webRoot = Join-Path $repoRoot "apps\web"
    $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npm) {
        $npm = (Get-Command npm -ErrorAction Stop).Source
    }

    if (-not $NoInstall -and -not (Test-Path (Join-Path $webRoot "node_modules\expo\package.json"))) {
        Write-Step "installing frontend packages"
        Push-Location $webRoot
        try {
            & $npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed with exit code $LASTEXITCODE"
            }
        } finally {
            Pop-Location
        }
    }

    Set-ProcessEnv "EXPO_PUBLIC_API_BASE_URL" "http://localhost:$(EnvValue "API_PORT" "18000")/api"
    Set-ProcessEnv "EXPO_NO_TELEMETRY" "1"
    Set-ProcessEnv "BROWSER" "none"

    $process = Start-LoggedProcess "frontend" $npm @("run", "web") $webRoot
    $webUrl = "http://127.0.0.1:$webPort"
    Wait-Http "Expo web" $webUrl 90
    Write-Stage "frontend:done"
    return @{
        Url = $webUrl
        Process = $process
    }
}

Stop-LocalProcesses

Write-Stage "services:start"
$pg = Start-Postgres
Write-Stage "services:postgres-ready"
$redis = Start-Redis
Write-Stage "services:redis-ready"
$minio = Start-MinIO
Write-Stage "services:minio-ready"

$api = $null
if (-not $NoBackend -and -not $ServicesOnly) {
    $api = Start-Backend -PostgresUrl $pg.Url -RedisUrl $redis.Url -MinioHealthUrl $minio.HealthUrl
}

$frontend = $null
if (-not $NoFrontend -and -not $ServicesOnly) {
    $frontend = Start-Frontend
}

$state = [ordered]@{
    startedAt = (Get-Date).ToString("o")
    services = [ordered]@{
        postgres = @{ port = $pg.Port; data = Join-Path $runtimeDir "postgres-data"; pid = if ($pg.Process) { $pg.Process.Id } else { $null } }
        redis = @{ port = $redis.Port; pid = $redis.Process.Id }
        minio = @{ healthUrl = $minio.HealthUrl; consoleUrl = $minio.ConsoleUrl; pid = $minio.Process.Id }
    }
    backend = if ($api) { @{ healthUrl = $api.HealthUrl; pid = $api.Process.Id } } else { $null }
    frontend = if ($frontend) { @{ url = $frontend.Url; pid = $frontend.Process.Id } } else { $null }
}

$state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile

Write-Ready "local stack started"
if ($frontend) {
    Write-Host "web:     $($frontend.Url)"
}
if ($api) {
    Write-Host "api:     $($api.HealthUrl)"
}
Write-Host "minio:   $($minio.ConsoleUrl)"
Write-Host "logs:    $logDir"
