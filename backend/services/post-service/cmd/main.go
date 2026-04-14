package main

import (
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("POST_SERVICE_PORT")
	if port == "" {
		port = "8005"
	}

	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "post-service", "status": "ok"})
	})

	r.GET("/types", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"visibility": []string{"public", "subscriber_only", "paid"},
		})
	})

	_ = r.Run(":" + port)
}
