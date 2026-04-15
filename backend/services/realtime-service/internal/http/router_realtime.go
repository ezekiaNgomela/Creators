package http

import (
	"github.com/gin-gonic/gin"
	"creators/backend/services/realtime-service/internal/session"
	"creators/backend/services/realtime-service/internal/ws"
)

func NewRealtimeRouter(redisAddr string) *gin.Engine {
	r := gin.Default()

	hub := ws.NewHub()
	store := session.NewStore(redisAddr)
	handler := NewWSHandler(hub, store)

	r.GET("/ws", handler.Handle)

	return r
}
