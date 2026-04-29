package main

import "time"

type HealthResponse struct {
	Service   string            `json:"service"`
	Status    string            `json:"status"`
	Checks    map[string]string `json:"checks"`
	Timestamp string            `json:"timestamp"`
}

type User struct {
	ID           int64
	Email        string
	Name         string
	Provider     string
	PasswordHash *string
	CreatedAt    time.Time
}

type AuthUser struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Provider  string `json:"provider"`
	CreatedAt string `json:"createdAt"`
}

type AuthResponse struct {
	Token string   `json:"token"`
	User  AuthUser `json:"user"`
}

type LiveRoom struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Host      string    `json:"host"`
	Topic     string    `json:"topic"`
	Viewers   int       `json:"viewers"`
	StartsAt  time.Time `json:"startsAt"`
	Status    string    `json:"status"`
	Accent    string    `json:"accent"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type FeedPost struct {
	ID        int64    `json:"id"`
	Body      string   `json:"body"`
	Mood      string   `json:"mood"`
	Author    AuthUser `json:"author"`
	CreatedAt string   `json:"createdAt"`
}

type FeedResponse struct {
	User      AuthUser   `json:"user"`
	LiveRooms []LiveRoom `json:"liveRooms"`
	Posts     []FeedPost `json:"posts"`
}

type ProfileResponse struct {
	User     AuthUser `json:"user"`
	Bio      string   `json:"bio"`
	Headline string   `json:"headline"`
	Location string   `json:"location"`
}

type CommentResponse struct {
	ID         int64    `json:"id"`
	TargetID   int64    `json:"targetId"`
	TargetType string   `json:"targetType"`
	Body       string   `json:"body"`
	Author     AuthUser `json:"author"`
	CreatedAt  string   `json:"createdAt"`
}

type LiveRating struct {
	LiveRoomID int64   `json:"liveRoomId"`
	Average    float64 `json:"average"`
	Count      int64   `json:"count"`
	UserScore  int     `json:"userScore"`
}

type LiveIndex struct {
	Live      []LiveRoom   `json:"live"`
	Scheduled []LiveRoom   `json:"scheduled"`
	Previous  []LiveRoom   `json:"previous"`
	Following []LiveRoom   `json:"following"`
	Ratings   []LiveRating `json:"ratings"`
}

type ChatContact struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	Subtitle         string            `json:"subtitle"`
	LastBody         string            `json:"lastBody"`
	UpdatedAt        string            `json:"updatedAt"`
	Type             string            `json:"type"`
	ParticipantCount int               `json:"participantCount"`
	Participants     []ChatParticipant `json:"participants"`
}

type ChatParticipant struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type ChatMessage struct {
	ID        int64    `json:"id"`
	ContactID string   `json:"contactId"`
	RoomID    string   `json:"roomId"`
	Body      string   `json:"body"`
	Sender    AuthUser `json:"sender"`
	CreatedAt string   `json:"createdAt"`
	Own       bool     `json:"own"`
}

type ChatUser struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Headline string `json:"headline"`
}

func toAuthUser(user User) AuthUser {
	return AuthUser{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Provider:  user.Provider,
		CreatedAt: user.CreatedAt.UTC().Format(time.RFC3339),
	}
}
