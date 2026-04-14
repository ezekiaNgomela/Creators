package main

import (
	"log"
	"os"

	httpx "creators/backend/services/post-service-next/internal/http"
)

func main() {
	port := os.Getenv("POST_SERVICE_PORT")
	if port == "" {
		port = "8005"
	}

	r := httpx.NewRouter()
	log.Printf("post-service-next listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
