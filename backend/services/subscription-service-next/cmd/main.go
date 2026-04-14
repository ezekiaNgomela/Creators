package main

import (
	"log"
	"os"

	httpx "creators/backend/services/subscription-service-next/internal/http"
)

func main() {
	port := os.Getenv("SUBSCRIPTION_SERVICE_PORT")
	if port == "" {
		port = "8003"
	}

	r := httpx.NewRouter()
	log.Printf("subscription-service-next listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
