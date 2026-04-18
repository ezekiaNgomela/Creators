package app

import (
	"context"
	"net/http"
	"time"

	"creators/backend/services/auth-service-next/internal/config"
	authhttp "creators/backend/services/auth-service-next/internal/http"
	"creators/backend/services/auth-service-next/internal/repository"
	"creators/backend/services/auth-service-next/internal/service"
)

func New() (http.Handler, func() error, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, nil, err
	}

	repo, err := openRepositoryWithRetry(cfg.DatabaseURL, 30, 3*time.Second)
	if err != nil {
		return nil, nil, err
	}

	svc := service.New(cfg, repo)
	handler := authhttp.NewRouter(cfg, svc)

	return handler, func() error {
		repo.Close()
		return nil
	}, nil
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
		if attempt < attempts {
			time.Sleep(delay)
		}
	}

	return nil, lastErr
}
