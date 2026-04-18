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
		for _, service := range upstream.Registry() {
			mapService(api, service)
		}
	}

	return r
}

func mapService(api *gin.RouterGroup, service upstream.Service) {
	proxy, err := upstream.NewProxy(service)
	if err != nil {
		panic(err)
	}

	api.GET("/"+service.Route+"/health", func(c *gin.Context) {
		c.Request.URL.Path = "/health"
		c.Request.URL.RawPath = ""
		c.Request.RequestURI = "/health"
		proxy.ServeHTTP(c.Writer, c.Request)
	})

	api.Any("/"+service.Route, func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	})

	api.Any("/"+service.Route+"/*proxyPath", func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	})
}
