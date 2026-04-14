package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const Header = "X-Request-ID"

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader(Header)
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Writer.Header().Set(Header, requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}
