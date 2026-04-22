# Creators

Creators runs locally without Docker.

## Structure

- `apps/api` - Go API entrypoint
- `apps/web` - React/Vite web entrypoint
- `run-project.ps1` - starts Postgres, Redis, MinIO, API, and web
- `scripts/stop-local.ps1` - stops the local stack

## Run

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
