package http

import "github.com/gin-gonic/gin"

func NewRouter() *gin.Engine {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "auth-service", "status": "ok"})
	})

	api := r.Group("/api/auth")
	{
		api.POST("/register", register)
		api.POST("/login", login)
		api.GET("/me", me)
	}

	return r
}

func register(c *gin.Context) {
	c.JSON(200, gin.H{"message": "register endpoint scaffolded"})
}

func login(c *gin.Context) {
	c.JSON(200, gin.H{"message": "login endpoint scaffolded"})
}

func me(c *gin.Context) {
	c.JSON(200, gin.H{"message": "me endpoint scaffolded"})
}
