package http

import (
	"net/http"

	"creators/backend/services/realtime-service/internal/session"
	"creators/backend/services/realtime-service/internal/ws"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSHandler struct {
	Hub   *ws.Hub
	Store *session.Store
}

func NewWSHandler(hub *ws.Hub, store *session.Store) *WSHandler {
	return &WSHandler{Hub: hub, Store: store}
}

func (h *WSHandler) Handle(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing session_id"})
		return
	}

	userID, err := h.Store.GetUser(sessionID)
	if err != nil || userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client := &ws.Client{UserID: userID, Send: make(chan []byte, 32)}
	h.Hub.Register(client)
	defer h.Hub.Unregister(userID)
	defer conn.Close()

	go func() {
		for msg := range client.Send {
			_ = conn.WriteMessage(websocket.TextMessage, msg)
		}
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		h.Hub.Broadcast(msg)
	}
}
