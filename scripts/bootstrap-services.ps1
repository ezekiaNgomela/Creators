$services = @(
  'auth-service',
  'user-service',
  'subscription-service',
  'chat-service',
  'post-service',
  'stream-service',
  'notification-service',
  'wallet-service',
  'promotion-service'
)

foreach ($name in $services) {
  $root = Join-Path 'backend/services' $name
  $cmd = Join-Path $root 'cmd'
  $internal = Join-Path $root 'internal'

  New-Item -ItemType Directory -Force -Path $cmd | Out-Null
  New-Item -ItemType Directory -Force -Path $internal | Out-Null

  if (-not (Test-Path (Join-Path $root 'go.mod'))) {
    "module creators/backend/services/$name`n`ngo 1.23.0`n" | Set-Content (Join-Path $root 'go.mod')
  }

  if (-not (Test-Path (Join-Path $cmd 'main.go'))) {
@"
package main

import "fmt"

func main() {
    fmt.Println("$name ready")
}
"@ | Set-Content (Join-Path $cmd 'main.go')
  }
}

Write-Host 'All service folders have been scaffolded.'
