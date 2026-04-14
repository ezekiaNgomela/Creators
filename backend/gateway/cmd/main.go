package main

import (
	"log"
	"os"

	"creators/backend/gateway/internal/router"
)

func main() {
	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = "8000"
	}

	r := router.New()
	log.Printf("gateway listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
