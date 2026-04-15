package ws

import (
	"encoding/json"
	"sync"
)

type Event struct {
	Type    string      `json:"type"`
	RoomID  string      `json:"roomId,omitempty"`
	UserID  string      `json:"userId,omitempty"`
	Payload interface{} `json:"payload,omitempty"`
}

type RoomHub struct {
	rooms map[string]map[string]*Client
	mu    sync.Mutex
}

func NewRoomHub() *RoomHub {
	return &RoomHub{rooms: make(map[string]map[string]*Client)}
}

func (h *RoomHub) Join(roomID string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.rooms[roomID]; !ok {
		h.rooms[roomID] = make(map[string]*Client)
	}
	h.rooms[roomID][c.UserID] = c
}

func (h *RoomHub) Leave(roomID string, userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.rooms[roomID]; !ok {
		return
	}
	delete(h.rooms[roomID], userID)
	if len(h.rooms[roomID]) == 0 {
		delete(h.rooms, roomID)
	}
}

func (h *RoomHub) ViewerCount(roomID string) int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.rooms[roomID])
}

func (h *RoomHub) BroadcastToRoom(roomID string, evt Event) {
	h.mu.Lock()
	clients := h.rooms[roomID]
	h.mu.Unlock()
	if len(clients) == 0 {
		return
	}
	msg, _ := json.Marshal(evt)
	for _, c := range clients {
		select {
		case c.Send <- msg:
		default:
		}
	}
}
