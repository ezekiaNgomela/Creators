package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

func main() {
	port := firstEnv("PORT", "APP_PORT", "API_PORT")
	if port == "" {
		port = "18000"
	}
	postgresURL := firstEnv("POSTGRES_URL", "DATABASE_URL")
	if postgresURL == "" {
		postgresURL = "postgres://postgres:postgres@127.0.0.1:15432/creators?sslmode=disable"
	}
	redisURL := valueOrDefault("REDIS_URL", "redis://127.0.0.1:16379/0")

	ctx := context.Background()
	if err := ensureSchemaPrerequisites(ctx, postgresURL); err != nil {
		log.Fatalf("database prerequisite initialization failed: %v", err)
	}

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

	uploadDir := valueOrDefault("UPLOAD_DIR", "uploads")
	handler := &Handler{
		Service:        &DataService{Pool: pool},
		Redis:          redisClient,
		MinioHealthURL: minioHealthURL(),
		UploadDir:      uploadDir,
		Renderer:       NewStudioRenderer(uploadDir),
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
	mux.HandleFunc("/api/media", handler.HandleMediaUpload)
	mux.HandleFunc("/api/studio/render", handler.HandleStudioRender)
	mux.HandleFunc("/api/studio/render/jobs", handler.HandleStudioRenderJob)
	mux.HandleFunc("/api/posts", handler.HandlePosts)
	mux.HandleFunc("/api/profile", handler.HandleProfile)
	mux.HandleFunc("/api/live", handler.HandleLive)
	mux.HandleFunc("/api/live/rate", handler.HandleLiveRate)
	mux.HandleFunc("/api/notifications", handler.HandleNotifications)
	mux.HandleFunc("/api/calls", handler.HandleCalls)
	mux.HandleFunc("/api/realtime", handler.HandleRealtime)
	mux.HandleFunc("/api/comments", handler.HandleComments)
	mux.HandleFunc("/api/users", handler.HandleUsers)
	mux.HandleFunc("/api/chats", handler.HandleChats)
	mux.HandleFunc("/api/chats/participants", handler.HandleChatParticipants)
	mux.HandleFunc("/api/chats/messages", handler.HandleChatMessages)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(handler.UploadDir))))

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           requestLogger(withCORS(mux)),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("creators api listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s origin=%q", r.Method, r.URL.Path, r.Header.Get("Origin"))
		next.ServeHTTP(w, r)
	})
}

func minioHealthURL() string {
	if envFlag("DISABLE_MINIO_HEALTH") {
		return ""
	}
	return valueOrDefault("MINIO_HEALTH_URL", "http://127.0.0.1:9000/minio/health/live")
}

func envFlag(name string) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(name))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
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
