package http

import (
	"net/http"
	"strings"

	"creators/backend/services/auth-service-next/internal/config"
	"creators/backend/services/auth-service-next/internal/service"
	"github.com/gin-gonic/gin"
)

func NewRouter(cfg config.Config, svc *service.Service) *gin.Engine {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "auth-service-next", "status": "ok"})
	})

	api := r.Group("/api/auth")
	{
		api.POST("/register/user", func(c *gin.Context) {
			var req service.RegisterUserRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			res, err := svc.RegisterUser(c.Request.Context(), req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, res)
		})

		api.POST("/register/super-user", func(c *gin.Context) {
			var req service.RegisterSuperUserRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			res, err := svc.RegisterSuperUser(c.Request.Context(), req)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, res)
		})

		api.POST("/login", func(c *gin.Context) {
			var req service.LoginRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			res, err := svc.Login(c.Request.Context(), req)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, res)
		})

		api.GET("/verify-email", func(c *gin.Context) {
			token := c.Query("token")
			if token == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing token"})
				return
			}
			if err := svc.VerifyEmail(c.Request.Context(), token); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "email verified"})
		})

		api.GET("/google/url", func(c *gin.Context) {
			url, err := svc.GoogleAuthURL()
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"url": url})
		})

		api.GET("/google/callback", func(c *gin.Context) {
			c.JSON(http.StatusNotImplemented, gin.H{
				"message": "callback scaffolded",
				"code":    c.Query("code"),
			})
		})

		api.GET("/me", func(c *gin.Context) {
			tokenString := extractBearer(c.GetHeader("Authorization"))
			if tokenString == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
				return
			}
			user, err := svc.Me(c.Request.Context(), tokenString)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, user)
		})
	}

	_ = cfg
	return r
}

func extractBearer(header string) string {
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
