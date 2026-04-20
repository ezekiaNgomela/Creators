param(
    [switch]$NoDocker,
    [switch]$NoBuild,
    [switch]$Rebuild,
    [int]$WebPort = 8081,
    [int]$DockerTimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $repoRoot "backend"
$webRoot = Join-Path $repoRoot "apps\web"
$runtimeDir = Join-Path $repoRoot ".runtime-bin"
$backendExe = Join-Path $runtimeDir "devstack.exe"

function Write-Step($Message) {
    Write-Host "[run] $Message"
}

function Write-Ready($Message) {
    Write-Host "[ready] $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
    Write-Host "[warn] $Message" -ForegroundColor Yellow
}

function Write-Fail($Message) {
    Write-Host "[error] $Message" -ForegroundColor Red
}

function Stop-Listeners($Ports) {
    $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $Ports -contains $_.LocalPort }

    $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Warn "stopped old listener $($process.ProcessName) pid=${processId}"
        } catch {
            Write-Warn "could not stop old listener pid=${processId}: $($_.Exception.Message)"
        }
    }
}

function Invoke-WithTimeout($Name, $ScriptBlock, $TimeoutSeconds) {
    $job = Start-Job -ScriptBlock $ScriptBlock
    try {
        $completed = Wait-Job -Job $job -Timeout $TimeoutSeconds
        if (-not $completed) {
            throw "$Name timed out after $TimeoutSeconds seconds"
        }

        Receive-Job -Job $job
        if ($job.State -eq "Failed") {
            throw "$Name failed"
        }
    } finally {
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
}

function Test-DockerReady($TimeoutSeconds) {
    try {
        $exitCode = Invoke-WithTimeout "docker info" { docker info *> $null; $LASTEXITCODE } $TimeoutSeconds
        return $exitCode -eq 0
    } catch {
        return $false
    }
}

function Ensure-Docker() {
    if ($NoDocker) {
        Write-Warn "skipping Docker startup because -NoDocker was passed"
        return
    }

    if (-not (Test-DockerReady 10)) {
        $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktop) {
            Write-Step "starting Docker Desktop"
            Start-Process -FilePath $dockerDesktop | Out-Null
        }

        $deadline = (Get-Date).AddSeconds($DockerTimeoutSeconds)
        do {
            Start-Sleep -Seconds 5
            if (Test-DockerReady 10) {
                break
            }
        } while ((Get-Date) -lt $deadline)
    }

    if (-not (Test-DockerReady 10)) {
        throw "Docker Desktop is not ready. Start or restart Docker Desktop, then run .\run-project.ps1 again."
    }

    Write-Step "starting Postgres, Redis, and MinIO"
    $composeExitCode = Invoke-WithTimeout "docker compose up" { docker compose up -d postgres redis minio; $LASTEXITCODE } 120
    if ($composeExitCode -ne 0) {
        throw "docker compose failed while starting dependencies"
    }
}

function Build-BackendIfNeeded() {
    New-Item -ItemType Directory -Force $runtimeDir | Out-Null

    if ($NoBuild -and (Test-Path $backendExe)) {
        Write-Warn "using existing backend executable because -NoBuild was passed"
        return
    }

    if ((Test-Path $backendExe) -and -not $Rebuild) {
        Write-Step "using existing backend executable"
        return
    }

    Write-Step "building backend devstack"
    Push-Location $backendRoot
    try {
        go build -o $backendExe ./devstack
        if ($LASTEXITCODE -ne 0) {
            throw "go build failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

function Start-LoggedProcess($Name, $FilePath, $Arguments, $WorkingDirectory) {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = $Arguments
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $process.EnableRaisingEvents = $true

    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -MessageData $Name -Action {
        if ($EventArgs.Data) {
            Write-Host "[$($Event.MessageData)] $($EventArgs.Data)"
        }
    } | Out-Null

    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -MessageData $Name -Action {
        if ($EventArgs.Data) {
            Write-Host "[$($Event.MessageData)] $($EventArgs.Data)"
        }
    } | Out-Null

    if (-not $process.Start()) {
        throw "failed to start $Name"
    }
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    return $process
}

function Wait-Http($Name, $Url, $TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 *> $null
            Write-Ready "$Name is available at $Url"
            return $true
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)

    Write-Warn "$Name did not answer yet at $Url"
    return $false
}

function Stop-Child($Process, $Name) {
    if ($null -eq $Process) {
        return
    }
    if ($Process.HasExited) {
        return
    }

    Write-Step "stopping $Name"
    try {
        $Process.Kill($true)
    } catch {
        try {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        } catch {
        }
    }
}

$backendProcess = $null
$webProcess = $null

try {
    Set-Location $repoRoot
    Ensure-Docker
    Build-BackendIfNeeded

    Stop-Listeners @(4001, 18000, 18003, 18005, 18006, 18007, $WebPort)

    Write-Step "starting backend services"
    $backendProcess = Start-LoggedProcess "backend" $backendExe "" $repoRoot

    Wait-Http "backend gateway" "http://127.0.0.1:18000/health" 45 | Out-Null

    $npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npx) {
        $npx = (Get-Command npx -ErrorAction Stop).Source
    }

    Write-Step "starting Expo web frontend"
    $env:CI = "1"
    $env:EXPO_NO_TELEMETRY = "1"
    $webProcess = Start-LoggedProcess "web" $npx "expo start --web --port $WebPort" $webRoot

    $webUrl = "http://localhost:$WebPort"
    Wait-Http "web app" $webUrl 90 | Out-Null

    Write-Ready "open the app here: $webUrl"
    Write-Step "press Ctrl+C to stop frontend and backend"

    while ($true) {
        if ($backendProcess.HasExited) {
            throw "backend exited with code $($backendProcess.ExitCode)"
        }
        if ($webProcess.HasExited) {
            throw "web frontend exited with code $($webProcess.ExitCode)"
        }
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Fail $_.Exception.Message
    exit 1
} finally {
    Stop-Child $webProcess "web frontend"
    Stop-Child $backendProcess "backend"
}
