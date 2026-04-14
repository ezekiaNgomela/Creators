#!/usr/bin/env bash
set -euo pipefail

services=(
  auth-service
  user-service
  subscription-service
  chat-service
  post-service
  stream-service
  notification-service
  wallet-service
  promotion-service
)

for name in "${services[@]}"; do
  root="backend/services/${name}"
  mkdir -p "${root}/cmd" "${root}/internal"

  if [ ! -f "${root}/go.mod" ]; then
    cat > "${root}/go.mod" <<EOF
module creators/backend/services/${name}

go 1.23.0
EOF
  fi

  if [ ! -f "${root}/cmd/main.go" ]; then
    cat > "${root}/cmd/main.go" <<EOF
package main

import "fmt"

func main() {
    fmt.Println("${name} ready")
}
EOF
  fi
done

echo "All service folders have been scaffolded."
