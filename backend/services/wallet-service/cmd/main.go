package main

import (
	"context"
	"log"
	"os"

	wallethttp "creators/backend/services/wallet-service/internal/http"
	"creators/backend/services/wallet-service/internal/repository"
	"creators/backend/services/wallet-service/internal/service"
)

func main() {
	port := os.Getenv("WALLET_SERVICE_PORT")
	if port == "" {
		port = "8002"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/creators?sslmode=disable"
	}

	repo, err := repository.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer repo.Close()

	svc := service.New(repo)
	r := wallethttp.NewRouter(svc)

	log.Printf("wallet-service listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
