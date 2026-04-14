package main

import (
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("WALLET_SERVICE_PORT")
	if port == "" {
		port = "8002"
	}

	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "wallet-service", "status": "ok"})
	})
	r.GET("/pricing", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"coin_to_usd": "10 coins = 1 USD",
			"stream_examples": []string{"1 minute = 0.1 coin", "30 minutes = 10 coins"},
		})
	})
	_ = r.Run(":" + port)
}
