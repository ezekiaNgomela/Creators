FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /creators-api .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /creators-api /creators-api
EXPOSE 8080
CMD ["/creators-api"]
