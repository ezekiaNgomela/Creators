# Creators

Creators is a modern starter monorepo for a subscription-based creator platform.

## Product goals
- normal users can register with email/password or continue with Google later
- super users can register, verify email, create channels, sell content, publish posts, and host paid streams
- users can buy coins, subscribe to channels, and pay to join streams
- monetization supports promotions and revenue sharing

## Stack
- React + Vite + TypeScript web app
- Go services
- PostgreSQL
- Redis
- MinIO
- Docker Compose

## Services in this repo
- gateway
- auth-service-next
- wallet-service
- subscription-service
- stream-service

## Quick start
```bash
cp .env.example .env
docker compose up -d
make run-auth-next
make run-gateway
```

## Notes
This repo focuses on a clean, scalable service layout first. Chat, posts, notifications, and advanced stream delivery can be added on the same service contract later.
