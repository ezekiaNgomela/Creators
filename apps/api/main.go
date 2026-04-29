package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

func main() {
	port := valueOrDefault("APP_PORT", valueOrDefault("API_PORT", "18000"))
	postgresURL := firstEnv("POSTGRES_URL", "DATABASE_URL")
	if postgresURL == "" {
		postgresURL = "postgres://postgres:postgres@127.0.0.1:15432/creators?sslmode=disable"
	}
	redisURL := valueOrDefault("REDIS_URL", "redis://127.0.0.1:16379/0")

	ctx := context.Background()
	pool, err := initDB(ctx, postgresURL)
	if err != nil {
		log.Fatalf("database initialization failed: %v", err)
	}
	defer pool.Close()

	redisOptions, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("redis initialization failed: %v", err)
	}
	redisClient := redis.NewClient(redisOptions)
	defer redisClient.Close()

	handler := &Handler{
		Service:        &DataService{Pool: pool},
		Redis:          redisClient,
		MinioHealthURL: valueOrDefault("MINIO_HEALTH_URL", "http://127.0.0.1:9000/minio/health/live"),
		JWTSecret:      valueOrDefault("JWT_SECRET", "change-me"),
		JWTIssuer:      valueOrDefault("JWT_ISSUER", "creators-auth"),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api", handler.HandleRoot)
	mux.HandleFunc("/api/health", handler.HandleHealth)
	mux.HandleFunc("/api/auth/register", handler.HandleRegister)
	mux.HandleFunc("/api/auth/login", handler.HandleLogin)
	mux.HandleFunc("/api/auth/me", handler.HandleMe)
	mux.HandleFunc("/api/auth/logout", handler.HandleLogout)
	mux.HandleFunc("/api/auth/google/start", handler.HandleGoogleStart)
	mux.HandleFunc("/api/auth/google/callback", handler.HandleGoogleCallback)
	mux.HandleFunc("/api/feed", handler.HandleFeed)
	mux.HandleFunc("/api/posts", handler.HandlePosts)
	mux.HandleFunc("/api/profile", handler.HandleProfile)
	mux.HandleFunc("/api/live", handler.HandleLive)
	mux.HandleFunc("/api/live/rate", handler.HandleLiveRate)
	mux.HandleFunc("/api/comments", handler.HandleComments)
	mux.HandleFunc("/api/chats", handler.HandleChats)
	mux.HandleFunc("/api/chats/messages", handler.HandleChatMessages)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("creators api listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func firstEnv(names ...string) string {
	for _, name := range names {
		value := os.Getenv(name)
		if value != "" {
			return value
		}
	}
	return ""
}
