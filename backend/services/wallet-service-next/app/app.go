package app

import (
	"net/http"

	httpx "creators/backend/services/wallet-service-next/internal/http"
)

func New() (http.Handler, func() error, error) {
	return httpx.NewRouter(), nil, nil
}
