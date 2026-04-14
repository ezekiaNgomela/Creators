package main

import (
	"log"
	"os"

	httpx "creators/backend/services/wallet-service-next/internal/http"
)

func main() {
	port := os.Getenv("WALLET_SERVICE_PORT")
	if port == "" {
		port = "8007"
	}

	r := httpx.NewRouter()
	log.Printf("wallet-service-next listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
