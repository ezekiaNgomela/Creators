package main

import (
	"os"
	"strconv"

	"creators/backend/services/stream-service/internal/pricing"
	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("STREAM_SERVICE_PORT")
	if port == "" {
		port = "8004"
	}

	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "stream-service", "status": "ok"})
	})
	r.GET("/pricing", func(c *gin.Context) {
		minutes, _ := strconv.Atoi(c.DefaultQuery("minutes", "30"))
		c.JSON(200, gin.H{
			"minutes": minutes,
			"cost_coins": pricing.CalculateStreamCost(minutes),
			"mode_options": []string{"free", "subscriber_only", "pay_per_view"},
		})
	})
	_ = r.Run(":" + port)
}
