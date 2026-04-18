package app

import (
	"net/http"

	"github.com/joho/godotenv"

	httpx "creators/backend/services/stream-service-next/internal/http"
)

func New() (http.Handler, func() error, error) {
	_ = godotenv.Load("../../../.env", ".env")
	return httpx.NewRouter(), nil, nil
}
