package router

import (
	"net/http"

	"creators/backend/gateway-next/internal/upstream"
	mw "creators/backend/pkg/httpx/middleware"
	"github.com/gin-gonic/gin"
)

func New() *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), mw.RequestID())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service":   "gateway-next",
			"status":    "ok",
			"upstreams": upstream.Registry(),
		})
	})

	api := r.Group("/api")
	{
		mapService(api, "auth")
		mapService(api, "users")
		mapService(api, "subscriptions")
		mapService(api, "posts")
		mapService(api, "streams")
		mapService(api, "wallet")
		mapService(api, "promotions")
	}

	return r
}

func mapService(api *gin.RouterGroup, route string) {
	api.GET("/"+route+"/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"route":  route,
			"status": "ready-for-proxy",
		})
	})
}
