$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backend = Join-Path $root "backend"
$outDir = Join-Path $backend ".docker\bin"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$services = @(
  @{ Name = "gateway-next"; Path = "gateway-next" },
  @{ Name = "auth-service-next"; Path = "services/auth-service-next" },
  @{ Name = "post-service-next"; Path = "services/post-service-next" },
  @{ Name = "subscription-service-next"; Path = "services/subscription-service-next" },
  @{ Name = "stream-service-next"; Path = "services/stream-service-next" },
  @{ Name = "wallet-service-next"; Path = "services/wallet-service-next" }
)

Push-Location $backend
try {
  foreach ($service in $services) {
    $output = Join-Path $outDir $service.Name
    Write-Host "Building $($service.Name)..."
    $env:CGO_ENABLED = "0"
    $env:GOOS = "linux"
    $env:GOARCH = "amd64"
    go build -o $output ".\$($service.Path)\cmd"
  }
}
finally {
  Pop-Location
  Remove-Item Env:\CGO_ENABLED -ErrorAction SilentlyContinue
  Remove-Item Env:\GOOS -ErrorAction SilentlyContinue
  Remove-Item Env:\GOARCH -ErrorAction SilentlyContinue
}
