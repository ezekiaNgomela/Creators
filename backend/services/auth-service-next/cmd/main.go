package main

import (
	"context"
	"fmt"
	"log"
	"time"

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

	repo, err := openRepositoryWithRetry(cfg.DatabaseURL, 30, 3*time.Second)
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

func openRepositoryWithRetry(databaseURL string, attempts int, delay time.Duration) (*repository.Repository, error) {
	var lastErr error

	for attempt := 1; attempt <= attempts; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		repo, err := repository.New(ctx, databaseURL)
		cancel()
		if err == nil {
			return repo, nil
		}

		lastErr = err
		log.Printf("auth-service-next waiting for postgres (attempt %d/%d): %v", attempt, attempts, err)
		if attempt < attempts {
			time.Sleep(delay)
		}
	}

	return nil, fmt.Errorf("auth-service-next could not connect to postgres after %d attempts: %w", attempts, lastErr)
}
