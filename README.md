# Creators

Creators runs locally without Docker.

## Structure

- `apps/api` - Go API entrypoint
- `apps/web` - React/Vite web entrypoint
- `run-project.ps1` - starts Postgres, Redis, MinIO, API, and web
- `scripts/stop-local.ps1` - stops the local stack

## Run

### 1. Infrastructure & API
Run the runner script from the root directory to start the database, cache, and Go API:
```powershell
.\run-project.ps1
```

The runner starts each service directly and writes local-only data/logs under `.local/`.

## Stop

```powershell
.\scripts\stop-local.ps1
```

## URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:18000/api`
- Backend health: `http://localhost:18000/api/health`
- MinIO console: `http://localhost:9001`

## Render smoke testing

Use the root `render.yaml` Blueprint to deploy the Go API, Vite web app, Expo web export, Postgres, and Redis-compatible Render Key Value for online testing. See `docs/render-deployment.md` for the deployment steps, required URLs, and post-deploy smoke-test checklist.
