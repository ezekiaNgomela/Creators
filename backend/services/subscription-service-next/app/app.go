package app

import (
	"net/http"

	httpx "creators/backend/services/subscription-service-next/internal/http"
)

func New() (http.Handler, func() error, error) {
	return httpx.NewRouter(), nil, nil
}
