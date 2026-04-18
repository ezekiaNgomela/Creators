package main

import (
	"log"
	"os"

	"creators/backend/gateway-next/internal/router"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("../../.env", ".env")

	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = "18000"
	}

	r := router.New()
	log.Printf("gateway-next listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
