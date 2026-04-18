package router

import (
	"net/http"
	"os"

	"creators/backend/gateway-next/internal/upstream"
	mw "creators/backend/pkg/httpx/middleware"
	"github.com/gin-gonic/gin"
)

func New() *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), mw.RequestID(), cors())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service":   "gateway-next",
			"status":    "ok",
			"upstreams": upstream.Registry(),
		})
	})

	api := r.Group("/api")
	{
		for _, service := range upstream.Registry() {
			mapService(api, service)
		}
	}

	return r
}

func cors() gin.HandlerFunc {
	allowedOrigin := os.Getenv("FRONTEND_URL")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:8081"
	}

	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key, X-Request-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func mapService(api *gin.RouterGroup, service upstream.Service) {
	proxy, err := upstream.NewProxy(service)
	if err != nil {
		panic(err)
	}

	api.Any("/"+service.Route+"/*proxyPath", func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	})
}
