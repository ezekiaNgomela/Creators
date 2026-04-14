FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/backend/services/auth-service-next
RUN go mod download && go build -o auth-service-next ./cmd/main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/backend/services/auth-service-next/auth-service-next ./auth-service-next
EXPOSE 8001
CMD ["./auth-service-next"]
