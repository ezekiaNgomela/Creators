# Creators

Minimal monorepo with one frontend entry, one backend entry, and one Docker Compose command.

## Structure

- `apps/api` - Go API entrypoint
- `apps/web` - React web entrypoint
- `docker-compose.yml` - starts the full stack
- `.env.example` - local environment template

## Run

1. Copy `.env.example` to `.env`
2. Run:

```bash
docker compose up --build
```

## URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:18000/api/health`
- MinIO console: `http://localhost:9001`
