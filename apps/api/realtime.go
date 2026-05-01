package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var realtimeUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "" || isAllowedOrigin(origin)
	},
}

type realtimeClientMessage struct {
	Type   string          `json:"type"`
	CallID int64           `json:"callId"`
	Data   json.RawMessage `json:"data"`
}

func (h *Handler) HandleRealtime(w http.ResponseWriter, r *http.Request) {
	if h.Redis == nil {
		writeError(w, http.StatusServiceUnavailable, "realtime is unavailable")
		return
	}
	token := r.URL.Query().Get("token")
	if token == "" {
		writeError(w, http.StatusUnauthorized, "token is required")
		return
	}
	claims, err := parseToken(token, h.JWTSecret, h.JWTIssuer)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid token")
		return
	}

	connection, err := realtimeUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer connection.Close()
	connection.SetReadLimit(8192)
	var writeMu sync.Mutex
	writeJSON := func(payload any) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return connection.WriteJSON(payload)
	}
	writeMessage := func(messageType int, payload []byte) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return connection.WriteMessage(messageType, payload)
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	channels := []string{realtimeUserChannel(claims.Subject)}
	if callIDValue := r.URL.Query().Get("callId"); callIDValue != "" {
		if callID, err := strconv.ParseInt(callIDValue, 10, 64); err == nil && callID > 0 {
			channels = append(channels, realtimeCallChannel(callID))
		}
	}
	pubsub := h.Redis.Subscribe(ctx, channels...)
	defer pubsub.Close()

	if err := writeJSON(map[string]any{
		"type": "connected",
		"data": map[string]any{"userId": claims.Subject, "channels": channels},
	}); err != nil {
		return
	}

	go func() {
		for {
			var message realtimeClientMessage
			if err := connection.ReadJSON(&message); err != nil {
				cancel()
				return
			}
			if message.Type == "ping" {
				_ = writeJSON(map[string]any{"type": "pong", "data": time.Now().UTC().Format(time.RFC3339)})
				continue
			}
			if message.Type == "call_signal" && message.CallID > 0 {
				payload, _ := json.Marshal(map[string]any{
					"type":   "call_signal",
					"fromId": claims.Subject,
					"callId": message.CallID,
					"data":   json.RawMessage(message.Data),
				})
				_ = h.Redis.Publish(ctx, realtimeCallChannel(message.CallID), payload).Err()
			}
		}
	}()

	channel := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case message := <-channel:
			if message == nil {
				return
			}
			if err := writeMessage(websocket.TextMessage, []byte(message.Payload)); err != nil {
				return
			}
		}
	}
}

func realtimeUserChannel(userID int64) string {
	return "realtime:user:" + strconv.FormatInt(userID, 10)
}

func realtimeCallChannel(callID int64) string {
	return "realtime:call:" + strconv.FormatInt(callID, 10)
}
