FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/backend/services/auth-service
RUN go mod download && go build -o auth-service ./cmd/main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/backend/services/auth-service/auth-service ./auth-service
EXPOSE 8001
CMD ["./auth-service"]
