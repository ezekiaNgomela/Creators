package main

import (
	"context"
	"log"

	"creators/backend/services/auth-service-next/internal/config"
	authhttp "creators/backend/services/auth-service-next/internal/http"
	"creators/backend/services/auth-service-next/internal/repository"
	"creators/backend/services/auth-service-next/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	repo, err := repository.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer repo.Close()

	svc := service.New(cfg, repo)
	r := authhttp.NewRouter(cfg, svc)

	log.Printf("auth-service-next listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
