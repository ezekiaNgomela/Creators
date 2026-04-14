package http

import (
	"net/http"

	"creators/backend/services/subscription-service-next/internal/service"
	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	r := gin.Default()
	svc := service.New()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "subscription-service-next", "status": "ok"})
	})

	api := r.Group("/api/subscriptions")
	{
		api.POST("/channel/subscribe", func(c *gin.Context) {
			var req service.SubscribeRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			res, err := svc.Subscribe(req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, res)
		})

		api.POST("/access-check", func(c *gin.Context) {
			var req service.AccessCheckRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			res, err := svc.CheckAccess(req)
			if err != nil {
				c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, res)
		})
	}

	return r
}
