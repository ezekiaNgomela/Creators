package main

import (
	"log"
	"os"

	"creators/backend/services/auth-service/internal/http"
)

func main() {
	port := os.Getenv("AUTH_SERVICE_PORT")
	if port == "" {
		port = "8001"
	}

	r := http.NewRouter()
	log.Printf("auth-service listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
