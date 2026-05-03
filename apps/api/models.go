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
	AvatarURL    string
	PasswordHash *string
	CreatedAt    time.Time
}

type AuthUser struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Provider  string `json:"provider"`
	AvatarURL string `json:"avatarUrl"`
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
	CoverURL  string    `json:"coverUrl"`
	Viewers   int       `json:"viewers"`
	StartsAt  time.Time `json:"startsAt"`
	Status    string    `json:"status"`
	Accent    string    `json:"accent"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type FeedPost struct {
	ID             int64    `json:"id"`
	Body           string   `json:"body"`
	Mood           string   `json:"mood"`
	MediaURL       string   `json:"mediaUrl"`
	MediaType      string   `json:"mediaType"`
	FilterName     string   `json:"filterName"`
	OverlayText    string   `json:"overlayText"`
	Sticker        string   `json:"sticker"`
	TextColor      string   `json:"textColor"`
	BackgroundTone string   `json:"backgroundTone"`
	AspectRatio    string   `json:"aspectRatio"`
	CropZoom       float64  `json:"cropZoom"`
	CropX          int      `json:"cropX"`
	CropY          int      `json:"cropY"`
	Rotation       int      `json:"rotation"`
	CommentCount   int      `json:"commentCount"`
	LikeCount      int      `json:"likeCount"`
	PromotionScore int      `json:"promotionScore"`
	Tags           []string `json:"tags"`
	Gallery        []string `json:"gallery"`
	Author         AuthUser `json:"author"`
	CreatedAt      string   `json:"createdAt"`
}

type FeedResponse struct {
	User      AuthUser   `json:"user"`
	LiveRooms []LiveRoom `json:"liveRooms"`
	Posts     []FeedPost `json:"posts"`
}

type PostInput struct {
	Body           string  `json:"body"`
	Mood           string  `json:"mood"`
	MediaURL       string  `json:"mediaUrl"`
	MediaType      string  `json:"mediaType"`
	FilterName     string  `json:"filterName"`
	OverlayText    string  `json:"overlayText"`
	Sticker        string  `json:"sticker"`
	TextColor      string  `json:"textColor"`
	BackgroundTone string  `json:"backgroundTone"`
	AspectRatio    string  `json:"aspectRatio"`
	CropZoom       float64 `json:"cropZoom"`
	CropX          int     `json:"cropX"`
	CropY          int     `json:"cropY"`
	Rotation       int     `json:"rotation"`
}

type MediaUploadResponse struct {
	URL       string `json:"url"`
	MediaType string `json:"mediaType"`
	MimeType  string `json:"mimeType"`
	FileName  string `json:"fileName"`
}

type StudioRenderClip struct {
	ID             string  `json:"id"`
	Type           string  `json:"type"`
	Track          string  `json:"track"`
	Title          string  `json:"title"`
	URL            string  `json:"url"`
	Start          float64 `json:"start"`
	InPoint        float64 `json:"inPoint"`
	OutPoint       float64 `json:"outPoint"`
	SourceDuration float64 `json:"sourceDuration"`
	Format         string  `json:"format"`
	Gain           float64 `json:"gain"`
	AudioEffect    string  `json:"audioEffect"`
}

type StudioRenderInput struct {
	Clips        []StudioRenderClip `json:"clips"`
	OutputFormat string             `json:"outputFormat"`
	AspectRatio  string             `json:"aspectRatio"`
	FilterName   string             `json:"filterName"`
	CropZoom     float64            `json:"cropZoom"`
	Rotation     int                `json:"rotation"`
}

type StudioRendererHealth struct {
	Available        bool     `json:"available"`
	Binary           string   `json:"binary"`
	Version          string   `json:"version"`
	Message          string   `json:"message"`
	SupportedInputs  []string `json:"supportedInputs"`
	SupportedOutputs []string `json:"supportedOutputs"`
}

type StudioRenderJob struct {
	ID                string  `json:"id"`
	Status            string  `json:"status"`
	Message           string  `json:"message"`
	OutputURL         string  `json:"outputUrl"`
	OutputFormat      string  `json:"outputFormat"`
	RendererAvailable bool    `json:"rendererAvailable"`
	CreatedAt         string  `json:"createdAt"`
	StartedAt         *string `json:"startedAt"`
	FinishedAt        *string `json:"finishedAt"`
	Input             any     `json:"input,omitempty"`
}

type Notification struct {
	ID        int64   `json:"id"`
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	Type      string  `json:"type"`
	Link      string  `json:"link"`
	ReadAt    *string `json:"readAt"`
	CreatedAt string  `json:"createdAt"`
}

type CallSession struct {
	ID           int64             `json:"id"`
	RoomID       string            `json:"roomId"`
	Mode         string            `json:"mode"`
	Status       string            `json:"status"`
	CreatedBy    AuthUser          `json:"createdBy"`
	Participants []ChatParticipant `json:"participants"`
	CreatedAt    string            `json:"createdAt"`
	EndedAt      *string           `json:"endedAt"`
}

type ProfileResponse struct {
	User       AuthUser `json:"user"`
	Bio        string   `json:"bio"`
	Headline   string   `json:"headline"`
	Location   string   `json:"location"`
	AvatarURL  string   `json:"avatarUrl"`
	CoverURL   string   `json:"coverUrl"`
	WebsiteURL string   `json:"websiteUrl"`
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
		AvatarURL: user.AvatarURL,
		CreatedAt: user.CreatedAt.UTC().Format(time.RFC3339),
	}
}
