param(
    [switch]$NoBackend,
    [switch]$NoFrontend,
    [switch]$ServicesOnly,
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$localDir = Join-Path $repoRoot ".local"
$toolsDir = Join-Path $localDir "tools"
$dataDir = Join-Path $localDir "data"
$logDir = Join-Path $localDir "logs"
$binDir = Join-Path $localDir "bin"

New-Item -ItemType Directory -Force $localDir, $toolsDir, $dataDir, $logDir, $binDir | Out-Null

function Write-Step($Message) {
    Write-Host "[run] $Message"
}

function Write-Ready($Message) {
    Write-Host "[ready] $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
    Write-Host "[warn] $Message" -ForegroundColor Yellow
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

    throw "Postgres tool '$Name.exe' was not found. Install PostgreSQL locally or add it to PATH."
}

function Get-LocalTool($Name, $RelativePath) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $candidates = @(
        (Join-Path $toolsDir $RelativePath),
        (Join-Path $repoRoot ".runtime-bin\tools\$RelativePath")
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "$Name was not found. Put it in .local\tools\$RelativePath or add it to PATH."
}

function Stop-Listeners($Ports) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Ports -ErrorAction SilentlyContinue
    $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        if (-not $processId -or $processId -eq $PID) {
            continue
        }
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Warn "stopped old listener $($process.ProcessName) pid=$processId"
        }
        catch {
            Write-Warn "could not stop old listener pid=${processId}: $($_.Exception.Message)"
        }
    }
}

function Test-Tcp($HostName, [int]$Port, [int]$TimeoutMs = 300) {
    $client = New-Object Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Get-ListenerPid([int]$Port) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -First 1
    if ($listener) {
        return $listener.OwningProcess
    }
    return $null
}

function Stop-PostgresForData($DataPath) {
    $resolvedData = (Resolve-Path $DataPath -ErrorAction SilentlyContinue)
    if (-not $resolvedData) {
        return
    }

    $dataText = $resolvedData.Path
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -ieq "postgres.exe" -and
        $_.CommandLine -and
        $_.CommandLine.Contains($dataText)
    }

    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
            Write-Warn "stopped stale Postgres pid=$($process.ProcessId)"
        }
        catch {
            Write-Warn "could not stop stale Postgres pid=$($process.ProcessId): $($_.Exception.Message)"
        }
    }
}

function Start-LoggedProcess($Name, $FilePath, [string[]]$Arguments, $WorkingDirectory) {
    $stdout = Join-Path $logDir "$Name.out.log"
    $stderr = Join-Path $logDir "$Name.err.log"
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue

    $processArgs = @{
        FilePath               = $FilePath
        WorkingDirectory       = $WorkingDirectory
        RedirectStandardOutput = $stdout
        RedirectStandardError  = $stderr
        WindowStyle            = "Hidden"
        PassThru               = $true
    }
    if ($Arguments.Count -gt 0) {
        $processArgs.ArgumentList = $Arguments
    }

    $process = Start-Process @processArgs
    Write-Ready "$Name started pid=$($process.Id)"
    return $process
}

function Invoke-PostgresSql($PsqlPath, $Port, $User, $Password, $Database, $Sql) {
    $oldPassword = $env:PGPASSWORD
    $oldPreference = $ErrorActionPreference
    $env:PGPASSWORD = $Password
    $url = "postgres://$User@127.0.0.1:$Port/$Database`?sslmode=disable&connect_timeout=2"
    try {
        $ErrorActionPreference = "Continue"
        $output = & $PsqlPath -w $url -tAc $Sql 2>$null
        return [pscustomobject]@{
            ExitCode = $LASTEXITCODE
            Output   = $output
        }
    }
    finally {
        $env:PGPASSWORD = $oldPassword
        $ErrorActionPreference = $oldPreference
    }
}

function First-Text($Value) {
    if ($null -eq $Value) {
        return ""
    }
    return [string]($Value | Select-Object -First 1)
}

function Start-Postgres {
    $pgPort = [int](EnvValue "POSTGRES_PORT" "15432")
    $pgDb = EnvValue "POSTGRES_DB" "creators"
    $pgUser = EnvValue "POSTGRES_USER" "postgres"
    $pgPassword = EnvValue "POSTGRES_PASSWORD" "postgres"
    $pgData = Join-Path $dataDir "postgres"

    $initdb = Get-PostgresTool "initdb"
    $postgres = Get-PostgresTool "postgres"
    $psql = Get-PostgresTool "psql"

    if (-not (Test-Path (Join-Path $pgData "PG_VERSION"))) {
        Write-Step "initializing Postgres data"
        New-Item -ItemType Directory -Force $pgData | Out-Null
        $pwFile = Join-Path $localDir "postgres.pw"
        Set-Content -LiteralPath $pwFile -Value $pgPassword -NoNewline
        & $initdb -D $pgData -U $pgUser --pwfile=$pwFile --auth=scram-sha-256 --encoding=UTF8 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "initdb failed with exit code $LASTEXITCODE"
        }
    }

    $process = $null
    if (Test-Tcp "127.0.0.1" $pgPort) {
        Write-Ready "Postgres already listening on 127.0.0.1:$pgPort"
    }
    else {
        Stop-PostgresForData $pgData
        $pidFile = Join-Path $pgData "postmaster.pid"
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue

        Write-Step "starting Postgres on 127.0.0.1:$pgPort"
        $process = Start-LoggedProcess "postgres" $postgres @("-D", $pgData, "-p", "$pgPort", "-h", "127.0.0.1") $repoRoot
    }

    $ready = $false
    for ($attempt = 1; $attempt -le 120; $attempt++) {
        Start-Sleep -Milliseconds 500
        $result = Invoke-PostgresSql $psql $pgPort $pgUser $pgPassword "postgres" "SELECT 1"
        if ($result.ExitCode -eq 0 -and (First-Text $result.Output).Trim() -eq "1") {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        throw "Postgres did not accept SQL within 60 seconds. Please check the error log at: .local\logs\postgres.err.log"
    }

    $exists = Invoke-PostgresSql $psql $pgPort $pgUser $pgPassword "postgres" "SELECT 1 FROM pg_database WHERE datname='$pgDb'"
    if ((First-Text $exists.Output).Trim() -ne "1") {
        Write-Step "creating Postgres database $pgDb"
        $created = Invoke-PostgresSql $psql $pgPort $pgUser $pgPassword "postgres" "CREATE DATABASE `"$pgDb`""
        if ($created.ExitCode -ne 0) {
            throw "database creation failed with exit code $($created.ExitCode)"
        }
    }

    return @{
        Port = $pgPort
        Pid  = if ($process) { $process.Id } else { Get-ListenerPid $pgPort }
        Url  = "postgres://$pgUser`:$pgPassword@127.0.0.1:$pgPort/$pgDb`?sslmode=disable"
    }
}

function Start-Redis {
    $redisPort = [int](EnvValue "REDIS_PORT" "16379")
    $redisServer = Get-LocalTool "redis-server" "redis\redis-server.exe"
    $redisData = Join-Path $dataDir "redis"
    New-Item -ItemType Directory -Force $redisData | Out-Null

    $redisConf = Join-Path $localDir "redis.conf"
    @(
        "bind 127.0.0.1"
        "port $redisPort"
        "dir $($redisData.Replace('\', '/'))"
        "save `"`""
        "appendonly no"
    ) | Set-Content -LiteralPath $redisConf

    $process = $null
    if (Test-Tcp "127.0.0.1" $redisPort) {
        Write-Ready "Redis already listening on 127.0.0.1:$redisPort"
    }
    else {
        Write-Step "starting Redis on 127.0.0.1:$redisPort"
        $process = Start-LoggedProcess "redis" $redisServer @($redisConf) $repoRoot
    }
    return @{
        Port = $redisPort
        Pid  = if ($process) { $process.Id } else { Get-ListenerPid $redisPort }
        Url  = "redis://127.0.0.1:$redisPort/0"
    }
}

function Start-MinIO {
    $apiPort = [int](EnvValue "MINIO_API_PORT" "9000")
    $consolePort = [int](EnvValue "MINIO_CONSOLE_PORT" "9001")
    $rootUser = EnvValue "MINIO_ROOT_USER" "minioadmin"
    $rootPassword = EnvValue "MINIO_ROOT_PASSWORD" "minioadmin"
    $minioExe = Get-LocalTool "minio" "minio\minio.exe"
    $minioData = Join-Path $dataDir "minio"
    New-Item -ItemType Directory -Force $minioData | Out-Null

    Set-ProcessEnv "MINIO_ROOT_USER" $rootUser
    Set-ProcessEnv "MINIO_ROOT_PASSWORD" $rootPassword

    $process = $null
    if (Test-Tcp "127.0.0.1" $apiPort) {
        Write-Ready "MinIO already listening on 127.0.0.1:$apiPort"
    }
    else {
        Write-Step "starting MinIO on 127.0.0.1:$apiPort"
        $process = Start-LoggedProcess "minio" $minioExe @(
            "server",
            $minioData,
            "--address",
            "127.0.0.1:$apiPort",
            "--console-address",
            "127.0.0.1:$consolePort"
        ) $repoRoot
    }

    return @{
        Pid        = if ($process) { $process.Id } else { Get-ListenerPid $apiPort }
        HealthUrl  = "http://127.0.0.1:$apiPort/minio/health/live"
        ConsoleUrl = "http://127.0.0.1:$consolePort"
    }
}

function Start-Api($PostgresUrl, $RedisUrl, $MinioHealthUrl) {
    $apiPort = [int](EnvValue "API_PORT" "18000")
    $apiRoot = Join-Path $repoRoot "apps\api"
    $apiExe = Join-Path $binDir "creators-api.exe"

    Write-Step "building Go API"
    Push-Location $apiRoot
    try {
        go build -o $apiExe .
        if ($LASTEXITCODE -ne 0) {
            throw "go build failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }

    Set-ProcessEnv "APP_PORT" $apiPort
    Set-ProcessEnv "POSTGRES_URL" $PostgresUrl
    Set-ProcessEnv "DATABASE_URL" $PostgresUrl
    Set-ProcessEnv "REDIS_URL" $RedisUrl
    Set-ProcessEnv "MINIO_HEALTH_URL" $MinioHealthUrl
    Set-ProcessEnv "FRONTEND_ORIGIN" "http://localhost:$(EnvValue "WEB_PORT" "5173")"

    Write-Step "starting Go API on 127.0.0.1:$apiPort"
    $process = Start-LoggedProcess "api" $apiExe @() $repoRoot
    return @{
        Pid       = $process.Id
        Url       = "http://127.0.0.1:$apiPort/api"
        HealthUrl = "http://127.0.0.1:$apiPort/api/health"
    }
}

function Start-Web {
    $webPort = [int](EnvValue "WEB_PORT" "5173")
    $webRoot = Join-Path $repoRoot "apps\web"
    $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npm) {
        $npm = (Get-Command npm -ErrorAction Stop).Source
    }

    Set-ProcessEnv "VITE_API_BASE_URL" "http://localhost:$(EnvValue "API_PORT" "18000")/api"

    Write-Step "starting Vite web on 127.0.0.1:$webPort"
    $process = Start-LoggedProcess "web" $npm @("run", "web") $webRoot
    return @{
        Pid = $process.Id
        Url = "http://localhost:$webPort"
    }
}

$pgPort = [int](EnvValue "POSTGRES_PORT" "15432")
$redisPort = [int](EnvValue "REDIS_PORT" "16379")
$minioApiPort = [int](EnvValue "MINIO_API_PORT" "9000")
$minioConsolePort = [int](EnvValue "MINIO_CONSOLE_PORT" "9001")
$apiPort = [int](EnvValue "API_PORT" "18000")
$webPort = [int](EnvValue "WEB_PORT" "5173")

Stop-Listeners @($apiPort, $webPort)

$postgres = Start-Postgres
$redis = Start-Redis
$minio = Start-MinIO

$api = $null
if (-not $NoBackend -and -not $ServicesOnly) {
    $api = Start-Api $postgres.Url $redis.Url $minio.HealthUrl
}

$web = $null
if (-not $NoFrontend -and -not $ServicesOnly) {
    $web = Start-Web
}

$state = [ordered]@{
    startedAt = (Get-Date).ToString("o")
    services  = [ordered]@{
        postgres = @{ port = $postgres.Port; pid = $postgres.Pid }
        redis    = @{ port = $redis.Port; pid = $redis.Pid }
        minio    = @{ healthUrl = $minio.HealthUrl; consoleUrl = $minio.ConsoleUrl; pid = $minio.Pid }
    }
    backend   = if ($api) { @{ url = $api.Url; healthUrl = $api.HealthUrl; pid = $api.Pid } } else { $null }
    frontend  = if ($web) { @{ url = $web.Url; pid = $web.Pid } } else { $null }
}

$state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $localDir "pids.json")

Write-Ready "local stack started"
if ($web) {
    Write-Host "web:     $($web.Url)"
}
if ($api) {
    Write-Host "api:     $($api.Url)"
}
Write-Host "minio:   $($minio.ConsoleUrl)"
Write-Host "logs:    $logDir"

if ($web -and -not $NoOpen) {
    Start-Process $web.Url
}
