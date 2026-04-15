package ws

import (
	"log"
	"sync"
)

type Client struct {
	UserID string
	Send   chan []byte
}

type Hub struct {
	clients map[string]*Client
	mu      sync.Mutex
}

func NewHub() *Hub {
	return &Hub{clients: make(map[string]*Client)}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c.UserID] = c
}

func (h *Hub) Unregister(userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, userID)
}

func (h *Hub) Broadcast(msg []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, c := range h.clients {
		select {
		case c.Send <- msg:
		default:
			log.Println("dropping message")
		}
	}
}
