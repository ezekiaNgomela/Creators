FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/backend/gateway
RUN go mod download && go build -o gateway ./cmd/main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/backend/gateway/gateway ./gateway
EXPOSE 8000
CMD ["./gateway"]
