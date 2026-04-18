package app

import (
	"net/http"

	"creators/backend/gateway-next/internal/router"
)

func New() (http.Handler, func() error, error) {
	return router.New(), nil, nil
}
