package main

import (
	"log"
	"os"

	httpx "creators/backend/services/stream-service-next/internal/http"
)

func main() {
	port := os.Getenv("STREAM_SERVICE_PORT")
	if port == "" {
		port = "8006"
	}

	r := httpx.NewRouter()
	log.Printf("stream-service-next listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
