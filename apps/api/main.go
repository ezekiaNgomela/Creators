package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

const tokenCookieName = "creators_token"
const oauthStateCookieName = "creators_google_state"

type appServer struct {
	postgresPool   *pgxpool.Pool
	redisClient    *redis.Client
	minioHealthURL string
	frontendOrigin string
	jwtSecret      string
	jwtIssuer      string
	googleClient   googleConfig
}

type googleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type healthResponse struct {
	Service   string            `json:"service"`
	Status    string            `json:"status"`
	Checks    map[string]string `json:"checks"`
	Timestamp string            `json:"timestamp"`
}

type userResponse struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Provider  string `json:"provider"`
	CreatedAt string `json:"createdAt"`
}

type authResponse struct {
	Token string       `json:"token"`
	User  userResponse `json:"user"`
}

type apiError struct {
	Message string `json:"message"`
}

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type dbUser struct {
	ID           int64
	Email        string
	Name         string
	PasswordHash *string
	Provider     string
	CreatedAt    time.Time
}

type tokenClaims struct {
	Subject  int64  `json:"sub"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Provider string `json:"provider"`
	Issuer   string `json:"iss"`
	IssuedAt int64  `json:"iat"`
	Expires  int64  `json:"exp"`
}

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	IDToken     string `json:"id_token"`
}

type googleProfile struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	Picture       string `json:"picture"`
}

type liveRoomResponse struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Host      string `json:"host"`
	Topic     string `json:"topic"`
	Viewers   int    `json:"viewers"`
	StartsAt  string `json:"startsAt"`
	Status    string `json:"status"`
	Accent    string `json:"accent"`
	UpdatedAt string `json:"updatedAt"`
}

type postResponse struct {
	ID        int64        `json:"id"`
	Body      string       `json:"body"`
	Mood      string       `json:"mood"`
	Author    userResponse `json:"author"`
	CreatedAt string       `json:"createdAt"`
}

type feedResponse struct {
	User      userResponse       `json:"user"`
	LiveRooms []liveRoomResponse `json:"liveRooms"`
	Posts     []postResponse     `json:"posts"`
}

type createPostRequest struct {
	Body string `json:"body"`
	Mood string `json:"mood"`
}

type profileResponse struct {
	User     userResponse `json:"user"`
	Bio      string       `json:"bio"`
	Headline string       `json:"headline"`
	Location string       `json:"location"`
}

type profileUpdateRequest struct {
	Name     string `json:"name"`
	Bio      string `json:"bio"`
	Headline string `json:"headline"`
	Location string `json:"location"`
}

type commentResponse struct {
	ID         int64        `json:"id"`
	TargetID   int64        `json:"targetId"`
	TargetType string       `json:"targetType"`
	Body       string       `json:"body"`
	Author     userResponse `json:"author"`
	CreatedAt  string       `json:"createdAt"`
}

type commentRequest struct {
	TargetID   int64  `json:"targetId"`
	TargetType string `json:"targetType"`
	Body       string `json:"body"`
}

type liveRatingRequest struct {
	LiveRoomID int64 `json:"liveRoomId"`
	Score      int   `json:"score"`
}

type liveRatingResponse struct {
	LiveRoomID int64   `json:"liveRoomId"`
	Average    float64 `json:"average"`
	Count      int     `json:"count"`
	UserScore  int     `json:"userScore"`
}

type liveIndexResponse struct {
	Live      []liveRoomResponse   `json:"live"`
	Scheduled []liveRoomResponse   `json:"scheduled"`
	Previous  []liveRoomResponse   `json:"previous"`
	Following []liveRoomResponse   `json:"following"`
	Ratings   []liveRatingResponse `json:"ratings"`
}

type chatContactResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Subtitle  string `json:"subtitle"`
	LastBody  string `json:"lastBody"`
	UpdatedAt string `json:"updatedAt"`
}

type chatMessageResponse struct {
	ID        int64        `json:"id"`
	ContactID string       `json:"contactId"`
	Body      string       `json:"body"`
	Sender    userResponse `json:"sender"`
	CreatedAt string       `json:"createdAt"`
	Own       bool         `json:"own"`
}

type chatMessageRequest struct {
	ContactID string `json:"contactId"`
	Body      string `json:"body"`
}

func main() {
	port := valueOrDefault("APP_PORT", "8080")
	postgresURL := os.Getenv("POSTGRES_URL")
	redisURL := os.Getenv("REDIS_URL")

	server := &appServer{
		minioHealthURL: valueOrDefault("MINIO_HEALTH_URL", "http://minio:9000/minio/health/live"),
		frontendOrigin: valueOrDefault("FRONTEND_ORIGIN", "http://localhost:5173"),
		jwtSecret:      valueOrDefault("JWT_SECRET", "change-me"),
		jwtIssuer:      valueOrDefault("JWT_ISSUER", "creators-auth"),
		googleClient: googleConfig{
			ClientID:     strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID")),
			ClientSecret: strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET")),
			RedirectURL:  valueOrDefault("GOOGLE_REDIRECT_URL", "http://localhost:18000/api/auth/google/callback"),
		},
	}

	ctx := context.Background()

	postgresPool, err := pgxpool.New(ctx, postgresURL)
	if err != nil {
		log.Fatalf("postgres init failed: %v", err)
	}
	defer postgresPool.Close()
	server.postgresPool = postgresPool

	if err := server.ensureAuthSchema(ctx); err != nil {
		log.Fatalf("auth schema init failed: %v", err)
	}

	redisOptions, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("redis init failed: %v", err)
	}
	redisClient := redis.NewClient(redisOptions)
	defer redisClient.Close()
	server.redisClient = redisClient

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", server.handleHealth)
	mux.HandleFunc("/api/auth/register", server.handleRegister)
	mux.HandleFunc("/api/auth/login", server.handleLogin)
	mux.HandleFunc("/api/auth/me", server.handleMe)
	mux.HandleFunc("/api/auth/logout", server.handleLogout)
	mux.HandleFunc("/api/auth/google/start", server.handleGoogleStart)
	mux.HandleFunc("/api/auth/google/callback", server.handleGoogleCallback)
	mux.HandleFunc("/api/feed", server.handleFeed)
	mux.HandleFunc("/api/posts", server.handlePosts)
	mux.HandleFunc("/api/profile", server.handleProfile)
	mux.HandleFunc("/api/live", server.handleLive)
	mux.HandleFunc("/api/live/rate", server.handleLiveRating)
	mux.HandleFunc("/api/comments", server.handleComments)
	mux.HandleFunc("/api/chats", server.handleChats)
	mux.HandleFunc("/api/chats/messages", server.handleChatMessages)
	mux.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"service": "creators-api",
			"message": "api running",
		})
	})

	httpServer := &http.Server{
		Addr:              ":" + port,
		Handler:           server.withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("creators api listening on :%s", port)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func (s *appServer) ensureAuthSchema(ctx context.Context) error {
	_, err := s.postgresPool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			password_hash TEXT,
			provider TEXT NOT NULL DEFAULT 'email',
			google_sub TEXT UNIQUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS posts (
			id BIGSERIAL PRIMARY KEY,
			author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			body TEXT NOT NULL,
			mood TEXT NOT NULL DEFAULT 'Update',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS live_rooms (
			id BIGSERIAL PRIMARY KEY,
			title TEXT NOT NULL,
			host TEXT NOT NULL,
			topic TEXT NOT NULL,
			viewers INTEGER NOT NULL DEFAULT 0,
			starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			status TEXT NOT NULL DEFAULT 'live',
			accent TEXT NOT NULL DEFAULT 'ember',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS user_profiles (
			user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			bio TEXT NOT NULL DEFAULT '',
			headline TEXT NOT NULL DEFAULT '',
			location TEXT NOT NULL DEFAULT '',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS comments (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			target_type TEXT NOT NULL,
			target_id BIGINT NOT NULL,
			body TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS live_ratings (
			live_room_id BIGINT NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			PRIMARY KEY (live_room_id, user_id)
		);

		CREATE TABLE IF NOT EXISTS chat_messages (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			contact_id TEXT NOT NULL,
			body TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		INSERT INTO live_rooms (title, host, topic, viewers, starts_at, status, accent)
		SELECT 'Launch teardown: first paid drop', 'Mika Studio', 'Commerce', 248, now() - interval '11 minutes', 'live', 'ember'
		WHERE NOT EXISTS (SELECT 1 FROM live_rooms);

		INSERT INTO live_rooms (title, host, topic, viewers, starts_at, status, accent)
		SELECT 'Editing room: short-form batch', 'Noor Creates', 'Video', 96, now() - interval '27 minutes', 'live', 'moss'
		WHERE (SELECT COUNT(*) FROM live_rooms) < 2;

		INSERT INTO live_rooms (title, host, topic, viewers, starts_at, status, accent)
		SELECT 'Member Q&A before release', 'The Maker Table', 'Community', 64, now() + interval '18 minutes', 'scheduled', 'ink'
		WHERE (SELECT COUNT(*) FROM live_rooms) < 3;

		INSERT INTO live_rooms (title, host, topic, viewers, starts_at, status, accent)
		SELECT 'Archived critique: portfolio edits', 'Louise Thornton', 'Design', 0, now() - interval '3 days', 'previous', 'rose'
		WHERE (SELECT COUNT(*) FROM live_rooms) < 4;

		INSERT INTO live_rooms (title, host, topic, viewers, starts_at, status, accent)
		SELECT 'Tomorrow creator planning', 'Alejandro Hicks', 'Planning', 0, now() + interval '1 day', 'scheduled', 'moss'
		WHERE (SELECT COUNT(*) FROM live_rooms) < 5;
	`)
	return err
}

func (s *appServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(w, http.StatusOK, s.checkDependencies(r.Context()))
}

func (s *appServer) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var request registerRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid registration details")
		return
	}

	name := strings.TrimSpace(request.Name)
	email := normalizeEmail(request.Email)
	password := request.Password
	if name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if !validEmail(email) {
		writeError(w, http.StatusBadRequest, "enter a valid email")
		return
	}
	if len(password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not secure password")
		return
	}

	user, err := s.createEmailUser(r.Context(), name, email, string(hash))
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "an account already exists for this email")
			return
		}
		log.Printf("register failed: %v", err)
		writeError(w, http.StatusInternalServerError, "registration failed")
		return
	}

	s.writeAuth(w, http.StatusCreated, user)
}

func (s *appServer) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var request loginRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid login details")
		return
	}

	user, err := s.findUserByEmail(r.Context(), normalizeEmail(request.Email))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "email or password is incorrect")
			return
		}
		log.Printf("login lookup failed: %v", err)
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	if user.PasswordHash == nil {
		writeError(w, http.StatusUnauthorized, "use Google to continue with this account")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(request.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "email or password is incorrect")
		return
	}

	s.writeAuth(w, http.StatusOK, user)
}

func (s *appServer) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	claims, err := s.claimsFromRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sign in required")
		return
	}

	user, err := s.findUserByID(r.Context(), claims.Subject)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "account no longer exists")
			return
		}
		log.Printf("me lookup failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load account")
		return
	}

	writeJSON(w, http.StatusOK, map[string]userResponse{"user": toUserResponse(user)})
}

func (s *appServer) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	clearCookie(w, tokenCookieName)
	writeJSON(w, http.StatusOK, map[string]string{"status": "signed_out"})
}

func (s *appServer) handleFeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	user, ok := s.requireCurrentUser(w, r)
	if !ok {
		return
	}

	liveRooms, err := s.listLiveRooms(r.Context())
	if err != nil {
		log.Printf("live feed failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load live feed")
		return
	}

	posts, err := s.listPosts(r.Context())
	if err != nil {
		log.Printf("post feed failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load posts")
		return
	}

	writeJSON(w, http.StatusOK, feedResponse{
		User:      toUserResponse(user),
		LiveRooms: liveRooms,
		Posts:     posts,
	})
}

func (s *appServer) handlePosts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		user, ok := s.requireCurrentUser(w, r)
		if !ok {
			return
		}
		_ = user
		posts, err := s.listPosts(r.Context())
		if err != nil {
			log.Printf("post list failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not load posts")
			return
		}
		writeJSON(w, http.StatusOK, map[string][]postResponse{"posts": posts})
	case http.MethodPost:
		user, ok := s.requireCurrentUser(w, r)
		if !ok {
			return
		}

		var request createPostRequest
		if err := decodeJSON(r, &request); err != nil {
			writeError(w, http.StatusBadRequest, "invalid post")
			return
		}

		body := strings.TrimSpace(request.Body)
		mood := strings.TrimSpace(request.Mood)
		if mood == "" {
			mood = "Update"
		}
		if body == "" {
			writeError(w, http.StatusBadRequest, "post body is required")
			return
		}
		if len([]rune(body)) > 500 {
			writeError(w, http.StatusBadRequest, "posts are limited to 500 characters")
			return
		}
		if len([]rune(mood)) > 32 {
			writeError(w, http.StatusBadRequest, "mood is too long")
			return
		}

		post, err := s.createPost(r.Context(), user.ID, body, mood)
		if err != nil {
			log.Printf("post create failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not publish post")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]postResponse{"post": post})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *appServer) handleProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireCurrentUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		profile, err := s.getProfile(r.Context(), user)
		if err != nil {
			log.Printf("profile load failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not load profile")
			return
		}
		writeJSON(w, http.StatusOK, profile)
	case http.MethodPatch:
		var request profileUpdateRequest
		if err := decodeJSON(r, &request); err != nil {
			writeError(w, http.StatusBadRequest, "invalid profile")
			return
		}
		profile, err := s.updateProfile(r.Context(), user, request)
		if err != nil {
			log.Printf("profile update failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not update profile")
			return
		}
		writeJSON(w, http.StatusOK, profile)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *appServer) handleLive(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireCurrentUser(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	live, _ := s.listLiveRoomsByStatus(r.Context(), "live")
	scheduled, _ := s.listLiveRoomsByStatus(r.Context(), "scheduled")
	previous, _ := s.listLiveRoomsByStatus(r.Context(), "previous")
	ratings, err := s.listLiveRatings(r.Context(), user.ID)
	if err != nil {
		log.Printf("ratings load failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load live ratings")
		return
	}
	writeJSON(w, http.StatusOK, liveIndexResponse{
		Live:      live,
		Scheduled: scheduled,
		Previous:  previous,
		Following: append(live, scheduled...),
		Ratings:   ratings,
	})
}

func (s *appServer) handleLiveRating(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireCurrentUser(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var request liveRatingRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid rating")
		return
	}
	if request.Score < 1 || request.Score > 5 || request.LiveRoomID <= 0 {
		writeError(w, http.StatusBadRequest, "rating must be 1 to 5")
		return
	}
	rating, err := s.rateLiveRoom(r.Context(), user.ID, request.LiveRoomID, request.Score)
	if err != nil {
		log.Printf("live rating failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not rate live stream")
		return
	}
	writeJSON(w, http.StatusOK, rating)
}

func (s *appServer) handleComments(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireCurrentUser(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		targetType := strings.TrimSpace(r.URL.Query().Get("targetType"))
		targetID, _ := parseInt64(r.URL.Query().Get("targetId"))
		comments, err := s.listComments(r.Context(), targetType, targetID)
		if err != nil {
			log.Printf("comments load failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not load comments")
			return
		}
		writeJSON(w, http.StatusOK, map[string][]commentResponse{"comments": comments})
	case http.MethodPost:
		var request commentRequest
		if err := decodeJSON(r, &request); err != nil {
			writeError(w, http.StatusBadRequest, "invalid comment")
			return
		}
		comment, err := s.createComment(r.Context(), user.ID, request)
		if err != nil {
			log.Printf("comment create failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not add comment")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]commentResponse{"comment": comment})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *appServer) handleChats(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireCurrentUser(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	contacts, err := s.listChatContacts(r.Context(), user.ID)
	if err != nil {
		log.Printf("chat contacts failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load chats")
		return
	}
	writeJSON(w, http.StatusOK, map[string][]chatContactResponse{"contacts": contacts})
}

func (s *appServer) handleChatMessages(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireCurrentUser(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		contactID := strings.TrimSpace(r.URL.Query().Get("contactId"))
		messages, err := s.listChatMessages(r.Context(), user, contactID)
		if err != nil {
			log.Printf("chat messages failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not load messages")
			return
		}
		writeJSON(w, http.StatusOK, map[string][]chatMessageResponse{"messages": messages})
	case http.MethodPost:
		var request chatMessageRequest
		if err := decodeJSON(r, &request); err != nil {
			writeError(w, http.StatusBadRequest, "invalid message")
			return
		}
		message, err := s.createChatMessage(r.Context(), user, request)
		if err != nil {
			log.Printf("chat message failed: %v", err)
			writeError(w, http.StatusInternalServerError, "could not send message")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]chatMessageResponse{"message": message})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (s *appServer) handleGoogleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if !s.googleClient.configured() {
		s.redirectOrJSONGoogleError(w, r, "Google auth needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env")
		return
	}

	state, err := randomToken(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start Google auth")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookieName,
		Value:    state,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	authURL := s.googleClient.authURL(state)
	if wantsJSON(r) {
		writeJSON(w, http.StatusOK, map[string]string{"authUrl": authURL})
		return
	}
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func (s *appServer) handleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	errorParam := strings.TrimSpace(r.URL.Query().Get("error"))
	if errorParam != "" {
		s.redirectFrontend(w, r, "auth_error="+url.QueryEscape(errorParam))
		return
	}

	state := r.URL.Query().Get("state")
	stateCookie, err := r.Cookie(oauthStateCookieName)
	clearCookie(w, oauthStateCookieName)
	if err != nil || state == "" || subtle.ConstantTimeCompare([]byte(state), []byte(stateCookie.Value)) != 1 {
		s.redirectFrontend(w, r, "auth_error=invalid_google_state")
		return
	}

	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if code == "" {
		s.redirectFrontend(w, r, "auth_error=missing_google_code")
		return
	}

	profile, err := s.exchangeGoogleCode(r.Context(), code)
	if err != nil {
		log.Printf("google auth failed: %v", err)
		s.redirectFrontend(w, r, "auth_error=google_auth_failed")
		return
	}
	if !profile.EmailVerified {
		s.redirectFrontend(w, r, "auth_error=google_email_unverified")
		return
	}

	user, err := s.upsertGoogleUser(r.Context(), profile)
	if err != nil {
		log.Printf("google user upsert failed: %v", err)
		s.redirectFrontend(w, r, "auth_error=google_account_failed")
		return
	}

	token, err := s.issueToken(user)
	if err != nil {
		log.Printf("google token failed: %v", err)
		s.redirectFrontend(w, r, "auth_error=token_failed")
		return
	}

	setAuthCookie(w, token)
	s.redirectFrontend(w, r, "auth=google&auth_token="+url.QueryEscape(token))
}

func (s *appServer) writeAuth(w http.ResponseWriter, statusCode int, user dbUser) {
	token, err := s.issueToken(user)
	if err != nil {
		log.Printf("token failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}
	setAuthCookie(w, token)
	writeJSON(w, statusCode, authResponse{
		Token: token,
		User:  toUserResponse(user),
	})
}

func (s *appServer) createEmailUser(ctx context.Context, name string, email string, passwordHash string) (dbUser, error) {
	row := s.postgresPool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, provider)
		VALUES ($1, $2, $3, 'email')
		RETURNING id, email, name, password_hash, provider, created_at
	`, email, name, passwordHash)
	return scanUser(row)
}

func (s *appServer) findUserByEmail(ctx context.Context, email string) (dbUser, error) {
	row := s.postgresPool.QueryRow(ctx, `
		SELECT id, email, name, password_hash, provider, created_at
		FROM users
		WHERE email = $1
	`, email)
	return scanUser(row)
}

func (s *appServer) findUserByID(ctx context.Context, id int64) (dbUser, error) {
	row := s.postgresPool.QueryRow(ctx, `
		SELECT id, email, name, password_hash, provider, created_at
		FROM users
		WHERE id = $1
	`, id)
	return scanUser(row)
}

func (s *appServer) upsertGoogleUser(ctx context.Context, profile googleProfile) (dbUser, error) {
	name := strings.TrimSpace(profile.Name)
	if name == "" {
		name = strings.TrimSpace(profile.GivenName)
	}
	if name == "" {
		name = normalizeEmail(profile.Email)
	}

	row := s.postgresPool.QueryRow(ctx, `
		INSERT INTO users (email, name, provider, google_sub)
		VALUES ($1, $2, 'google', $3)
		ON CONFLICT (email) DO UPDATE SET
			name = EXCLUDED.name,
			provider = CASE WHEN users.password_hash IS NULL THEN 'google' ELSE users.provider END,
			google_sub = EXCLUDED.google_sub
		RETURNING id, email, name, password_hash, provider, created_at
	`, normalizeEmail(profile.Email), name, profile.Sub)
	return scanUser(row)
}

func (s *appServer) listLiveRooms(ctx context.Context) ([]liveRoomResponse, error) {
	rows, err := s.postgresPool.Query(ctx, `
		SELECT id, title, host, topic, viewers, starts_at, status, accent, updated_at
		FROM live_rooms
		ORDER BY
			CASE WHEN status = 'live' THEN 0 ELSE 1 END,
			starts_at ASC,
			id ASC
		LIMIT 8
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	liveRooms := []liveRoomResponse{}
	for rows.Next() {
		var room liveRoomResponse
		var startsAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&room.ID, &room.Title, &room.Host, &room.Topic, &room.Viewers, &startsAt, &room.Status, &room.Accent, &updatedAt); err != nil {
			return nil, err
		}
		room.StartsAt = startsAt.UTC().Format(time.RFC3339)
		room.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		liveRooms = append(liveRooms, room)
	}
	return liveRooms, rows.Err()
}

func (s *appServer) listPosts(ctx context.Context) ([]postResponse, error) {
	rows, err := s.postgresPool.Query(ctx, `
		SELECT
			posts.id,
			posts.body,
			posts.mood,
			posts.created_at,
			users.id,
			users.email,
			users.name,
			users.provider,
			users.created_at
		FROM posts
		JOIN users ON users.id = posts.author_id
		ORDER BY posts.created_at DESC, posts.id DESC
		LIMIT 60
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := []postResponse{}
	for rows.Next() {
		var post postResponse
		var createdAt time.Time
		var authorCreatedAt time.Time
		if err := rows.Scan(
			&post.ID,
			&post.Body,
			&post.Mood,
			&createdAt,
			&post.Author.ID,
			&post.Author.Email,
			&post.Author.Name,
			&post.Author.Provider,
			&authorCreatedAt,
		); err != nil {
			return nil, err
		}
		post.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		post.Author.CreatedAt = authorCreatedAt.UTC().Format(time.RFC3339)
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

func (s *appServer) createPost(ctx context.Context, authorID int64, body string, mood string) (postResponse, error) {
	row := s.postgresPool.QueryRow(ctx, `
		INSERT INTO posts (author_id, body, mood)
		VALUES ($1, $2, $3)
		RETURNING id, body, mood, created_at
	`, authorID, body, mood)

	var post postResponse
	var createdAt time.Time
	if err := row.Scan(&post.ID, &post.Body, &post.Mood, &createdAt); err != nil {
		return postResponse{}, err
	}
	user, err := s.findUserByID(ctx, authorID)
	if err != nil {
		return postResponse{}, err
	}
	post.Author = toUserResponse(user)
	post.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	return post, nil
}

func (s *appServer) getProfile(ctx context.Context, user dbUser) (profileResponse, error) {
	_, _ = s.postgresPool.Exec(ctx, `
		INSERT INTO user_profiles (user_id, headline, bio, location)
		VALUES ($1, 'Creator', '', '')
		ON CONFLICT (user_id) DO NOTHING
	`, user.ID)

	var profile profileResponse
	profile.User = toUserResponse(user)
	err := s.postgresPool.QueryRow(ctx, `
		SELECT bio, headline, location
		FROM user_profiles
		WHERE user_id = $1
	`, user.ID).Scan(&profile.Bio, &profile.Headline, &profile.Location)
	return profile, err
}

func (s *appServer) updateProfile(ctx context.Context, user dbUser, request profileUpdateRequest) (profileResponse, error) {
	name := strings.TrimSpace(request.Name)
	if name == "" {
		name = user.Name
	}
	bio := trimMax(request.Bio, 240)
	headline := trimMax(request.Headline, 80)
	location := trimMax(request.Location, 80)
	if headline == "" {
		headline = "Creator"
	}

	tx, err := s.postgresPool.Begin(ctx)
	if err != nil {
		return profileResponse{}, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE users SET name = $1 WHERE id = $2`, name, user.ID); err != nil {
		return profileResponse{}, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_profiles (user_id, bio, headline, location, updated_at)
		VALUES ($1, $2, $3, $4, now())
		ON CONFLICT (user_id) DO UPDATE SET
			bio = EXCLUDED.bio,
			headline = EXCLUDED.headline,
			location = EXCLUDED.location,
			updated_at = now()
	`, user.ID, bio, headline, location); err != nil {
		return profileResponse{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return profileResponse{}, err
	}

	updated, err := s.findUserByID(ctx, user.ID)
	if err != nil {
		return profileResponse{}, err
	}
	return s.getProfile(ctx, updated)
}

func (s *appServer) listLiveRoomsByStatus(ctx context.Context, status string) ([]liveRoomResponse, error) {
	rows, err := s.postgresPool.Query(ctx, `
		SELECT id, title, host, topic, viewers, starts_at, status, accent, updated_at
		FROM live_rooms
		WHERE status = $1
		ORDER BY starts_at DESC, id DESC
		LIMIT 20
	`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanLiveRooms(rows)
}

func scanLiveRooms(rows pgx.Rows) ([]liveRoomResponse, error) {
	liveRooms := []liveRoomResponse{}
	for rows.Next() {
		var room liveRoomResponse
		var startsAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&room.ID, &room.Title, &room.Host, &room.Topic, &room.Viewers, &startsAt, &room.Status, &room.Accent, &updatedAt); err != nil {
			return nil, err
		}
		room.StartsAt = startsAt.UTC().Format(time.RFC3339)
		room.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		liveRooms = append(liveRooms, room)
	}
	return liveRooms, rows.Err()
}

func (s *appServer) listLiveRatings(ctx context.Context, userID int64) ([]liveRatingResponse, error) {
	rows, err := s.postgresPool.Query(ctx, `
		SELECT
			live_rooms.id,
			COALESCE(AVG(live_ratings.score), 0),
			COUNT(live_ratings.score),
			COALESCE(MAX(CASE WHEN live_ratings.user_id = $1 THEN live_ratings.score END), 0)
		FROM live_rooms
		LEFT JOIN live_ratings ON live_ratings.live_room_id = live_rooms.id
		GROUP BY live_rooms.id
		ORDER BY live_rooms.id
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ratings := []liveRatingResponse{}
	for rows.Next() {
		var rating liveRatingResponse
		if err := rows.Scan(&rating.LiveRoomID, &rating.Average, &rating.Count, &rating.UserScore); err != nil {
			return nil, err
		}
		ratings = append(ratings, rating)
	}
	return ratings, rows.Err()
}

func (s *appServer) rateLiveRoom(ctx context.Context, userID int64, liveRoomID int64, score int) (liveRatingResponse, error) {
	_, err := s.postgresPool.Exec(ctx, `
		INSERT INTO live_ratings (live_room_id, user_id, score, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (live_room_id, user_id) DO UPDATE SET
			score = EXCLUDED.score,
			updated_at = now()
	`, liveRoomID, userID, score)
	if err != nil {
		return liveRatingResponse{}, err
	}

	var rating liveRatingResponse
	err = s.postgresPool.QueryRow(ctx, `
		SELECT
			$1::BIGINT,
			COALESCE(AVG(score), 0),
			COUNT(score),
			COALESCE(MAX(CASE WHEN user_id = $2 THEN score END), 0)
		FROM live_ratings
		WHERE live_room_id = $1
	`, liveRoomID, userID).Scan(&rating.LiveRoomID, &rating.Average, &rating.Count, &rating.UserScore)
	return rating, err
}

func (s *appServer) listComments(ctx context.Context, targetType string, targetID int64) ([]commentResponse, error) {
	if targetType == "" || targetID <= 0 {
		return []commentResponse{}, nil
	}
	rows, err := s.postgresPool.Query(ctx, `
		SELECT comments.id, comments.target_id, comments.target_type, comments.body, comments.created_at,
			users.id, users.email, users.name, users.provider, users.created_at
		FROM comments
		JOIN users ON users.id = comments.user_id
		WHERE comments.target_type = $1 AND comments.target_id = $2
		ORDER BY comments.created_at ASC
		LIMIT 100
	`, targetType, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []commentResponse{}
	for rows.Next() {
		var comment commentResponse
		var createdAt time.Time
		var authorCreatedAt time.Time
		if err := rows.Scan(
			&comment.ID,
			&comment.TargetID,
			&comment.TargetType,
			&comment.Body,
			&createdAt,
			&comment.Author.ID,
			&comment.Author.Email,
			&comment.Author.Name,
			&comment.Author.Provider,
			&authorCreatedAt,
		); err != nil {
			return nil, err
		}
		comment.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		comment.Author.CreatedAt = authorCreatedAt.UTC().Format(time.RFC3339)
		comments = append(comments, comment)
	}
	return comments, rows.Err()
}

func (s *appServer) createComment(ctx context.Context, userID int64, request commentRequest) (commentResponse, error) {
	targetType := strings.TrimSpace(request.TargetType)
	body := trimMax(request.Body, 280)
	if targetType != "post" && targetType != "live" {
		return commentResponse{}, errors.New("invalid target type")
	}
	if request.TargetID <= 0 || body == "" {
		return commentResponse{}, errors.New("invalid comment")
	}
	row := s.postgresPool.QueryRow(ctx, `
		INSERT INTO comments (user_id, target_type, target_id, body)
		VALUES ($1, $2, $3, $4)
		RETURNING id, target_id, target_type, body, created_at
	`, userID, targetType, request.TargetID, body)

	var comment commentResponse
	var createdAt time.Time
	if err := row.Scan(&comment.ID, &comment.TargetID, &comment.TargetType, &comment.Body, &createdAt); err != nil {
		return commentResponse{}, err
	}
	user, err := s.findUserByID(ctx, userID)
	if err != nil {
		return commentResponse{}, err
	}
	comment.Author = toUserResponse(user)
	comment.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	return comment, nil
}

func (s *appServer) listChatContacts(ctx context.Context, userID int64) ([]chatContactResponse, error) {
	contacts := seedContacts()
	for i := range contacts {
		var body string
		var updatedAt time.Time
		err := s.postgresPool.QueryRow(ctx, `
			SELECT body, created_at
			FROM chat_messages
			WHERE user_id = $1 AND contact_id = $2
			ORDER BY created_at DESC
			LIMIT 1
		`, userID, contacts[i].ID).Scan(&body, &updatedAt)
		if err == nil {
			contacts[i].LastBody = body
			contacts[i].UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		}
	}
	return contacts, nil
}

func (s *appServer) listChatMessages(ctx context.Context, user dbUser, contactID string) ([]chatMessageResponse, error) {
	contactID = normalizeContactID(contactID)
	if contactID == "" {
		return []chatMessageResponse{}, nil
	}
	rows, err := s.postgresPool.Query(ctx, `
		SELECT id, contact_id, body, created_at
		FROM chat_messages
		WHERE user_id = $1 AND contact_id = $2
		ORDER BY created_at ASC
		LIMIT 100
	`, user.ID, contactID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := seedMessages(user, contactID)
	for rows.Next() {
		var message chatMessageResponse
		var createdAt time.Time
		if err := rows.Scan(&message.ID, &message.ContactID, &message.Body, &createdAt); err != nil {
			return nil, err
		}
		message.Sender = toUserResponse(user)
		message.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		message.Own = true
		messages = append(messages, message)
	}
	return messages, rows.Err()
}

func (s *appServer) createChatMessage(ctx context.Context, user dbUser, request chatMessageRequest) (chatMessageResponse, error) {
	contactID := normalizeContactID(request.ContactID)
	body := trimMax(request.Body, 500)
	if contactID == "" || body == "" {
		return chatMessageResponse{}, errors.New("invalid message")
	}
	row := s.postgresPool.QueryRow(ctx, `
		INSERT INTO chat_messages (user_id, contact_id, body)
		VALUES ($1, $2, $3)
		RETURNING id, contact_id, body, created_at
	`, user.ID, contactID, body)

	var message chatMessageResponse
	var createdAt time.Time
	if err := row.Scan(&message.ID, &message.ContactID, &message.Body, &createdAt); err != nil {
		return chatMessageResponse{}, err
	}
	message.Sender = toUserResponse(user)
	message.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	message.Own = true
	return message, nil
}

func scanUser(row pgx.Row) (dbUser, error) {
	var user dbUser
	err := row.Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Provider, &user.CreatedAt)
	return user, err
}

func (s *appServer) issueToken(user dbUser) (string, error) {
	now := time.Now()
	claims := tokenClaims{
		Subject:  user.ID,
		Email:    user.Email,
		Name:     user.Name,
		Provider: user.Provider,
		Issuer:   s.jwtIssuer,
		IssuedAt: now.Unix(),
		Expires:  now.Add(7 * 24 * time.Hour).Unix(),
	}
	return signJWT(claims, s.jwtSecret)
}

func (s *appServer) claimsFromRequest(r *http.Request) (tokenClaims, error) {
	token := bearerToken(r.Header.Get("Authorization"))
	if token == "" {
		cookie, err := r.Cookie(tokenCookieName)
		if err == nil {
			token = cookie.Value
		}
	}
	if token == "" {
		return tokenClaims{}, errors.New("missing token")
	}
	return verifyJWT(token, s.jwtSecret, s.jwtIssuer)
}

func (s *appServer) requireCurrentUser(w http.ResponseWriter, r *http.Request) (dbUser, bool) {
	claims, err := s.claimsFromRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "sign in required")
		return dbUser{}, false
	}

	user, err := s.findUserByID(r.Context(), claims.Subject)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "account no longer exists")
			return dbUser{}, false
		}
		log.Printf("auth user lookup failed: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load account")
		return dbUser{}, false
	}
	return user, true
}

func signJWT(claims tokenClaims, secret string) (string, error) {
	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	unsigned := base64.RawURLEncoding.EncodeToString(headerJSON) + "." + base64.RawURLEncoding.EncodeToString(claimsJSON)
	signature := hmacSHA256(unsigned, secret)
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func verifyJWT(token string, secret string, issuer string) (tokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return tokenClaims{}, errors.New("invalid token")
	}

	unsigned := parts[0] + "." + parts[1]
	expected := base64.RawURLEncoding.EncodeToString(hmacSHA256(unsigned, secret))
	if subtle.ConstantTimeCompare([]byte(expected), []byte(parts[2])) != 1 {
		return tokenClaims{}, errors.New("invalid signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return tokenClaims{}, err
	}
	var claims tokenClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return tokenClaims{}, err
	}
	if claims.Issuer != issuer {
		return tokenClaims{}, errors.New("invalid issuer")
	}
	if time.Now().Unix() >= claims.Expires {
		return tokenClaims{}, errors.New("token expired")
	}
	return claims, nil
}

func hmacSHA256(value string, secret string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(value))
	return mac.Sum(nil)
}

func (s *appServer) exchangeGoogleCode(ctx context.Context, code string) (googleProfile, error) {
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", s.googleClient.ClientID)
	form.Set("client_secret", s.googleClient.ClientSecret)
	form.Set("redirect_uri", s.googleClient.RedirectURL)
	form.Set("grant_type", "authorization_code")

	tokenRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		return googleProfile{}, err
	}
	tokenRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	tokenResponse, err := http.DefaultClient.Do(tokenRequest)
	if err != nil {
		return googleProfile{}, err
	}
	defer tokenResponse.Body.Close()
	if tokenResponse.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(tokenResponse.Body, 2048))
		return googleProfile{}, fmt.Errorf("google token status %d: %s", tokenResponse.StatusCode, string(body))
	}

	var tokens googleTokenResponse
	if err := json.NewDecoder(tokenResponse.Body).Decode(&tokens); err != nil {
		return googleProfile{}, err
	}
	if tokens.AccessToken == "" {
		return googleProfile{}, errors.New("missing google access token")
	}

	profileRequest, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return googleProfile{}, err
	}
	profileRequest.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	profileResponse, err := http.DefaultClient.Do(profileRequest)
	if err != nil {
		return googleProfile{}, err
	}
	defer profileResponse.Body.Close()
	if profileResponse.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(profileResponse.Body, 2048))
		return googleProfile{}, fmt.Errorf("google profile status %d: %s", profileResponse.StatusCode, string(body))
	}

	var profile googleProfile
	if err := json.NewDecoder(profileResponse.Body).Decode(&profile); err != nil {
		return googleProfile{}, err
	}
	if profile.Sub == "" || !validEmail(profile.Email) {
		return googleProfile{}, errors.New("google profile missing verified identity")
	}
	return profile, nil
}

func (g googleConfig) configured() bool {
	return g.ClientID != "" && g.ClientSecret != "" && g.RedirectURL != ""
}

func (g googleConfig) authURL(state string) string {
	values := url.Values{}
	values.Set("client_id", g.ClientID)
	values.Set("redirect_uri", g.RedirectURL)
	values.Set("response_type", "code")
	values.Set("scope", "openid email profile")
	values.Set("state", state)
	values.Set("access_type", "offline")
	values.Set("prompt", "select_account")
	return "https://accounts.google.com/o/oauth2/v2/auth?" + values.Encode()
}

func (s *appServer) checkDependencies(parent context.Context) healthResponse {
	checks := map[string]string{}
	status := "ok"

	ctx, cancel := context.WithTimeout(parent, 2*time.Second)
	defer cancel()

	if err := s.postgresPool.Ping(ctx); err != nil {
		checks["postgres"] = "down"
		status = "degraded"
	} else {
		checks["postgres"] = "up"
	}

	if err := s.redisClient.Ping(ctx).Err(); err != nil {
		checks["redis"] = "down"
		status = "degraded"
	} else {
		checks["redis"] = "up"
	}

	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, s.minioHealthURL, nil)
	response, err := http.DefaultClient.Do(request)
	if err != nil || response.StatusCode >= 400 {
		checks["minio"] = "down"
		status = "degraded"
	} else {
		checks["minio"] = "up"
	}
	if response != nil {
		response.Body.Close()
	}

	return healthResponse{
		Service:   "creators-api",
		Status:    status,
		Checks:    checks,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

func (s *appServer) withCORS(next http.Handler) http.Handler {
	allowedOrigin := strings.TrimSpace(s.frontendOrigin)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if allowedOrigin != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *appServer) redirectOrJSONGoogleError(w http.ResponseWriter, r *http.Request, message string) {
	if wantsJSON(r) {
		writeError(w, http.StatusNotImplemented, message)
		return
	}
	s.redirectFrontend(w, r, "auth_error=google_not_configured")
}

func (s *appServer) redirectFrontend(w http.ResponseWriter, r *http.Request, query string) {
	target := strings.TrimRight(s.frontendOrigin, "/") + "/"
	if query != "" {
		target += "?" + query
	}
	http.Redirect(w, r, target, http.StatusTemporaryRedirect)
}

func decodeJSON(r *http.Request, value any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return err
	}
	return nil
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, apiError{Message: message})
}

func setAuthCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     tokenCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func toUserResponse(user dbUser) userResponse {
	return userResponse{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Provider:  user.Provider,
		CreatedAt: user.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".") && !strings.ContainsAny(email, " \t\r\n")
}

func bearerToken(header string) string {
	const prefix = "Bearer "
	if strings.HasPrefix(header, prefix) {
		return strings.TrimSpace(strings.TrimPrefix(header, prefix))
	}
	return ""
}

func randomToken(size int) (string, error) {
	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func parseInt64(value string) (int64, error) {
	var parsed int64
	_, err := fmt.Sscan(strings.TrimSpace(value), &parsed)
	return parsed, err
}

func trimMax(value string, max int) string {
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) > max {
		return string(runes[:max])
	}
	return value
}

func normalizeContactID(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	return trimMax(value, 80)
}

func seedContacts() []chatContactResponse {
	now := time.Now().UTC().Format(time.RFC3339)
	return []chatContactResponse{
		{ID: "alejandro-hicks", Name: "Alejandro Hicks", Subtitle: "3 mutual friends", LastBody: "Send a quick hello", UpdatedAt: now},
		{ID: "benjamin-webb", Name: "Benjamin Webb", Subtitle: "Launch channel", LastBody: "Shared a new studio note", UpdatedAt: now},
		{ID: "cecelia-harrington", Name: "Cecelia Harrington", Subtitle: "Design circle", LastBody: "Loved your last post", UpdatedAt: now},
		{ID: "barbara-blair", Name: "Barbara Blair", Subtitle: "Live collaborator", LastBody: "Ready for the stream", UpdatedAt: now},
		{ID: "louise-thornton", Name: "Louise Thornton", Subtitle: "Following", LastBody: "See you at the event", UpdatedAt: now},
	}
}

func seedMessages(user dbUser, contactID string) []chatMessageResponse {
	name := strings.ReplaceAll(contactID, "-", " ")
	title := strings.Title(name)
	contact := userResponse{
		ID:        0,
		Email:     contactID + "@contacts.local",
		Name:      title,
		Provider:  "contact",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	now := time.Now().UTC()
	return []chatMessageResponse{
		{ID: -2, ContactID: contactID, Body: "Hey, I saw your latest update.", Sender: contact, CreatedAt: now.Add(-12 * time.Minute).Format(time.RFC3339), Own: false},
		{ID: -1, ContactID: contactID, Body: "Want to collaborate on the next stream?", Sender: contact, CreatedAt: now.Add(-8 * time.Minute).Format(time.RFC3339), Own: false},
	}
}

func wantsJSON(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Accept"), "application/json") ||
		strings.EqualFold(r.URL.Query().Get("format"), "json")
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func valueOrDefault(value string, fallback string) string {
	current := strings.TrimSpace(os.Getenv(value))
	if current == "" {
		return fallback
	}
	return current
}
