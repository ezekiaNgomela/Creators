run-project:
	powershell -NoProfile -ExecutionPolicy Bypass -File .\run-project.ps1

run-backend:
	powershell -NoProfile -ExecutionPolicy Bypass -File .\run-backend.ps1

run-web:
	cd apps/web && npm run web

stop:
	powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop-local.ps1

fmt-go:
	cd backend && go fmt ./pkg/... ./gateway-next/... ./services/auth-service-next/... ./services/post-service-next/... ./services/subscription-service-next/... ./services/wallet-service-next/... ./services/stream-service-next/...

typecheck-web:
	cd apps/web && npm run typecheck
