# Creators

Creators runs locally without Docker. The development entrypoint starts the local dependency services, the Go API, and the Expo React Native frontend using the same ports from `.env`.

## Structure

- `apps/web` - Expo React Native frontend with a web target
- `apps/api` - Go API entrypoint for the local creator stack
- `backend/services` - expandable backend service modules
- `scripts/start-local.ps1` - installs and starts local Postgres, Redis, MinIO, API, and Expo web
- `scripts/stop-local.ps1` - stops the local stack
- `.env.example` - local environment template

## Run

1. Copy `.env.example` to `.env` if `.env` is missing.
2. Run:

```powershell
.\run-project.ps1
```

The first run downloads portable Redis and MinIO into `.runtime-bin` if they are missing. Postgres uses the local PostgreSQL binaries already installed on the machine.

## URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:18000/api/health`
- MinIO console: `http://localhost:9001`

## Stop

```powershell
.\scripts\stop-local.ps1
```
