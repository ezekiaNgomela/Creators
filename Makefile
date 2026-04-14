up:
	docker compose up -d postgres redis minio

down:
	docker compose down

run-auth:
	cd backend/services/auth-service && go run ./cmd/main.go

run-gateway:
	cd backend/gateway && go run ./cmd/main.go

run-web:
	cd apps/web && npm run dev

fmt-go:
	cd backend && go fmt ./...
