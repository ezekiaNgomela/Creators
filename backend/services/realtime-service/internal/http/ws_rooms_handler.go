package http

import (
	"encoding/json"
	"net/http"

	"creators/backend/services/realtime-service/internal/session"
	"creators/backend/services/realtime-service/internal/ws"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgraderRooms = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type RoomsHandler struct {
	Hub   *ws.RoomHub
	Store *session.Store
}

func NewRoomsHandler(hub *ws.RoomHub, store *session.Store) *RoomsHandler {
	return &RoomsHandler{Hub: hub, Store: store}
}

func (h *RoomsHandler) Handle(c *gin.Context) {
	sessionID := c.Query("session_id")
	userID, err := h.Store.GetUser(sessionID)
	if err != nil || userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	conn, err := upgraderRooms.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	client := &ws.Client{UserID: userID, Send: make(chan []byte, 32)}

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

		var evt ws.Event
		_ = json.Unmarshal(msg, &evt)

		switch evt.Type {
		case "join-room":
			h.Hub.Join(evt.RoomID, client)
			h.Hub.BroadcastToRoom(evt.RoomID, ws.Event{
				Type:   "viewer-count",
				RoomID: evt.RoomID,
				Payload: h.Hub.ViewerCount(evt.RoomID),
			})

		case "leave-room":
			h.Hub.Leave(evt.RoomID, userID)

		case "chat":
			h.Hub.BroadcastToRoom(evt.RoomID, ws.Event{
				Type:    "chat",
				RoomID:  evt.RoomID,
				UserID:  userID,
				Payload: evt.Payload,
			})
		}
	}
}
