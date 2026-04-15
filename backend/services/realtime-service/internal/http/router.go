package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "realtime-service", "status": "ok"})
	})

	r.GET("/ws", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "websocket endpoint placeholder"})
	})

	return r
}
