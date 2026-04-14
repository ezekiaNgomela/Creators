param(
    [Parameter(Mandatory = $true)]
    [string]$Name
)

$root = Join-Path "backend/services" $Name
$cmd = Join-Path $root "cmd"
$internal = Join-Path $root "internal"

New-Item -ItemType Directory -Force -Path $cmd | Out-Null
New-Item -ItemType Directory -Force -Path $internal | Out-Null

$module = "module creators/backend/services/$Name`n`ngo 1.23.0`n"
Set-Content -Path (Join-Path $root "go.mod") -Value $module

$main = @"
package main

import ""fmt""

func main() {
    fmt.Println(""$Name scaffold ready"")
}
"@
Set-Content -Path (Join-Path $cmd "main.go") -Value $main

Write-Host "Created service scaffold at $root"
