package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type healthResponse struct {
	Service   string            `json:"service"`
	Status    string            `json:"status"`
	Checks    map[string]string `json:"checks"`
	Timestamp string            `json:"timestamp"`
}

func main() {
	port := valueOrDefault("APP_PORT", "8080")
	postgresURL := os.Getenv("POSTGRES_URL")
	redisURL := os.Getenv("REDIS_URL")
	minioHealthURL := valueOrDefault("MINIO_HEALTH_URL", "http://minio:9000/minio/health/live")
	frontendOrigin := valueOrDefault("FRONTEND_ORIGIN", "http://localhost:5173")

	ctx := context.Background()

	postgresPool, err := pgxpool.New(ctx, postgresURL)
	if err != nil {
		log.Fatalf("postgres init failed: %v", err)
	}
	defer postgresPool.Close()

	redisOptions, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("redis init failed: %v", err)
	}
	redisClient := redis.NewClient(redisOptions)
	defer redisClient.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, checkDependencies(r.Context(), postgresPool, redisClient, minioHealthURL))
	})
	mux.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"service": "creators-api",
			"message": "api running",
		})
	})

	handler := withCORS(frontendOrigin, mux)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("creators api listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func checkDependencies(parent context.Context, postgresPool *pgxpool.Pool, redisClient *redis.Client, minioHealthURL string) healthResponse {
	checks := map[string]string{}
	status := "ok"

	ctx, cancel := context.WithTimeout(parent, 10*time.Second)
	defer cancel()

	if err := postgresPool.Ping(ctx); err != nil {
		checks["postgres"] = "down"
		status = "degraded"
	} else {
		checks["postgres"] = "up"
	}

	if err := redisClient.Ping(ctx).Err(); err != nil {
		checks["redis"] = "down"
		status = "degraded"
	} else {
		checks["redis"] = "up"
	}

	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, minioHealthURL, nil)
	response, err := http.DefaultClient.Do(request)
	if err != nil || response.StatusCode >= 400 {
		checks["minio"] = "down"
		status = "degraded"
	} else {
		checks["minio"] = "up"
	}
	if response != nil {
		response.Body.Close()
	}

	return healthResponse{
		Service:   "creators-api",
		Status:    status,
		Checks:    checks,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

func withCORS(frontendOrigin string, next http.Handler) http.Handler {
	allowedOrigin := strings.TrimSpace(frontendOrigin)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if allowedOrigin != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func valueOrDefault(value string, fallback string) string {
	current := strings.TrimSpace(os.Getenv(value))
	if current == "" {
		return fallback
	}
	return current
}
