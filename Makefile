up:
	docker compose up -d postgres redis minio

down:
	docker compose down

run-gateway:
	cd backend/gateway && go run ./cmd/main.go

run-auth-next:
	cd backend/services/auth-service-next && go run ./cmd/main.go

run-wallet:
	cd backend/services/wallet-service && go run ./cmd/main.go

run-subscription:
	cd backend/services/subscription-service && go run ./cmd/main.go

run-stream:
	cd backend/services/stream-service && go run ./cmd/main.go

run-web:
	cd apps/web && npm install && npm run dev

fmt-go:
	cd backend && go fmt ./...
