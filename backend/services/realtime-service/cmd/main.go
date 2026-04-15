package main

import (
	"log"
	"os"

	http "creators/backend/services/realtime-service/internal/http"
)

func main() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	r := http.NewRealtimeRouter(redisAddr)

	log.Println("realtime-service running on :8085")
	r.Run(":8085")
}
