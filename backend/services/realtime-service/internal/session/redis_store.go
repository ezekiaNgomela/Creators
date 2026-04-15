package session

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

type Store struct {
	rdb *redis.Client
}

func NewStore(addr string) *Store {
	rdb := redis.NewClient(&redis.Options{
		Addr: addr,
	})
	return &Store{rdb: rdb}
}

func (s *Store) CreateSession(sessionID string, userID string, ttl time.Duration) error {
	return s.rdb.Set(ctx, "session:"+sessionID, userID, ttl).Err()
}

func (s *Store) GetUser(sessionID string) (string, error) {
	return s.rdb.Get(ctx, "session:"+sessionID).Result()
}

func (s *Store) DeleteSession(sessionID string) error {
	return s.rdb.Del(ctx, "session:"+sessionID).Err()
}
