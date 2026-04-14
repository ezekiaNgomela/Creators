package router

import "github.com/gin-gonic/gin"

func New() *gin.Engine {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "gateway", "status": "ok"})
	})

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"service": "api", "status": "ok"})
		})
	}

	return r
}
