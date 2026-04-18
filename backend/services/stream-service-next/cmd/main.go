package main

import (
	"log"
	"os"

	httpx "creators/backend/services/stream-service-next/internal/http"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("../../../.env", ".env")

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
