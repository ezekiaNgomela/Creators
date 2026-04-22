up:
	powershell -ExecutionPolicy Bypass -File .\run-project.ps1

down:
	powershell -ExecutionPolicy Bypass -File .\scripts\stop-local.ps1

run-backend:
	powershell -ExecutionPolicy Bypass -File .\run-backend.ps1

run-web:
	cd apps/web && npm run web

fmt-go:
	cd apps/api && go fmt ./...
