package main

import (
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("SUBSCRIPTION_SERVICE_PORT")
	if port == "" {
		port = "8003"
	}

	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "subscription-service", "status": "ok"})
	})
	r.GET("/plans/defaults", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"super_user_billing": []string{"monthly", "yearly"},
			"access_unlocks": []string{"private channel", "subscriber posts", "subscriber streams"},
		})
	})
	_ = r.Run(":" + port)
}
