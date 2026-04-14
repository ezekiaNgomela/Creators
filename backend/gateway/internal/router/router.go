package router

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"

	"creators/backend/gateway/internal/middleware"
	"github.com/gin-gonic/gin"
)

func New() *gin.Engine {
	r := gin.Default()
	jwtSecret := os.Getenv("JWT_SECRET")

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "gateway", "status": "ok"})
	})

	api := r.Group("/api")
	{
		mountProxy(api, "/auth", os.Getenv("AUTH_SERVICE_URL"))

		protected := api.Group("")
		protected.Use(middleware.JWT(jwtSecret))
		mountProxy(protected, "/wallet", os.Getenv("WALLET_SERVICE_URL"))
		mountProxy(protected, "/subscriptions", os.Getenv("SUBSCRIPTION_SERVICE_URL"))
		mountProxy(protected, "/streams", os.Getenv("STREAM_SERVICE_URL"))
	}

	return r
}

func mountProxy(group *gin.RouterGroup, prefix string, target string) {
	group.Any(prefix+"/*path", func(c *gin.Context) {
		if target == "" {
			c.JSON(http.StatusNotImplemented, gin.H{"error": "service url not configured"})
			return
		}

		u, err := url.Parse(target)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid service url"})
			return
		}

		proxy := httputil.NewSingleHostReverseProxy(u)
		proxy.ServeHTTP(c.Writer, c.Request)
	})
}
