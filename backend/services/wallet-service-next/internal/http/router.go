package http

import (
	"net/http"

	"creators/backend/services/wallet-service-next/internal/service"
	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	r := gin.Default()
	svc := service.New()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "wallet-service-next", "status": "ok"})
	})

	api := r.Group("/api/wallet")
	{
		api.GET("/pricing", func(c *gin.Context) {
			c.JSON(http.StatusOK, svc.Pricing())
		})

		api.POST("/coin-purchase-intent", func(c *gin.Context) {
			var req service.CoinPurchaseIntentRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			idempotencyKey := c.GetHeader("Idempotency-Key")
			res, err := svc.CreateCoinPurchaseIntent(req, idempotencyKey)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, res)
		})

		api.POST("/charge", func(c *gin.Context) {
			var req service.ChargeRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			idempotencyKey := c.GetHeader("Idempotency-Key")
			res, err := svc.Charge(req, idempotencyKey)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, res)
		})
	}

	return r
}
