up:
	docker compose up -d postgres redis minio

down:
	docker compose down

run-auth:
	cd backend/services/auth-service-next && go run ./cmd/main.go

run-backend:
	powershell -ExecutionPolicy Bypass -File .\run-backend.ps1

run-gateway:
	cd backend/gateway-next && go run ./cmd/main.go

run-post:
	cd backend/services/post-service-next && go run ./cmd/main.go

run-subscriptions:
	cd backend/services/subscription-service-next && go run ./cmd/main.go

run-wallet:
	cd backend/services/wallet-service-next && go run ./cmd/main.go

run-stream:
	cd backend/services/stream-service-next && go run ./cmd/main.go

run-web:
	cd apps/web && npm run web

fmt-go:
	cd backend && go fmt ./pkg/... ./gateway-next/... ./services/auth-service-next/... ./services/post-service-next/... ./services/subscription-service-next/... ./services/wallet-service-next/... ./services/stream-service-next/...
