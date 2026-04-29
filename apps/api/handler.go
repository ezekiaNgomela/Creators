package main

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type Handler struct {
	Service        *DataService
	Redis          *redis.Client
	MinioHealthURL string
	JWTSecret      string
	JWTIssuer      string
}

func (h *Handler) HandleRoot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"service": "creators-api",
		"message": "api running",
	})
}

func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	checks := map[string]string{
		"postgres": "down",
		"redis":    "down",
		"minio":    "down",
	}
	if err := h.Service.Ping(ctx); err == nil {
		checks["postgres"] = "up"
	}
	if err := h.Redis.Ping(ctx).Err(); err == nil {
		checks["redis"] = "up"
	}
	if minioIsUp(ctx, h.MinioHealthURL) {
		checks["minio"] = "up"
	}

	status := "ok"
	code := http.StatusOK
	for _, value := range checks {
		if value != "up" {
			status = "degraded"
			code = http.StatusServiceUnavailable
			break
		}
	}

	writeJSON(w, code, HealthResponse{
		Service:   "creators-api",
		Status:    status,
		Checks:    checks,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *Handler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.Service.CreateUser(r.Context(), input.Name, input.Email, input.Password)
	if err != nil {
		writeError(w, http.StatusBadRequest, publicError(err))
		return
	}
	h.writeAuthResponse(w, http.StatusCreated, user)
}

func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.Service.Authenticate(r.Context(), input.Email, input.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, publicError(err))
		return
	}
	h.writeAuthResponse(w, http.StatusOK, user)
}

func (h *Handler) HandleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	user, err := h.Service.FindUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	writeJSON(w, http.StatusOK, map[string]AuthUser{"user": toAuthUser(user)})
}

func (h *Handler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) HandleGoogleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	config := googleConfigFromEnv()
	if !config.configured() {
		writeError(w, http.StatusNotImplemented, "Google sign-in is not configured for this local environment")
		return
	}

	state, err := randomToken(24)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start Google sign-in")
		return
	}
	setOAuthStateCookie(w, state)
	authURL := config.authURL(state)
	if r.URL.Query().Get("format") == "json" {
		writeJSON(w, http.StatusOK, map[string]string{"authUrl": authURL})
		return
	}
	http.Redirect(w, r, authURL, http.StatusFound)
}

func (h *Handler) HandleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	config := googleConfigFromEnv()
	if !config.configured() {
		h.redirectGoogleError(w, r, "google_not_configured")
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		h.redirectGoogleError(w, r, "google_missing_code")
		return
	}

	stateCookie, err := r.Cookie(oauthStateCookieName)
	clearOAuthStateCookie(w)
	if err != nil || stateCookie.Value == "" || stateCookie.Value != state {
		h.redirectGoogleError(w, r, "google_state_mismatch")
		return
	}

	profile, err := h.exchangeGoogleCode(r.Context(), code, config)
	if err != nil {
		h.redirectGoogleError(w, r, "google_exchange_failed")
		return
	}
	user, err := h.Service.UpsertGoogleUser(r.Context(), profile.Name, profile.Email, profile.Sub)
	if err != nil {
		h.redirectGoogleError(w, r, "google_account_failed")
		return
	}
	token, err := createToken(user, h.JWTSecret, h.JWTIssuer)
	if err != nil {
		h.redirectGoogleError(w, r, "google_session_failed")
		return
	}

	if wantsJSON(r) {
		writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: toAuthUser(user)})
		return
	}

	values := url.Values{}
	values.Set("auth", "google")
	values.Set("auth_token", token)
	http.Redirect(w, r, frontendOrigin()+"/?"+values.Encode(), http.StatusTemporaryRedirect)
}

func (h *Handler) HandleFeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	user, err := h.Service.FindUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	rooms, err := h.Service.ListLiveRooms(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load live rooms")
		return
	}
	posts, err := h.Service.ListPosts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load posts")
		return
	}

	writeJSON(w, http.StatusOK, FeedResponse{
		User:      toAuthUser(user),
		LiveRooms: rooms,
		Posts:     posts,
	})
}

func (h *Handler) HandlePosts(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	if r.Method == http.MethodGet {
		posts, err := h.Service.ListPosts(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load posts")
			return
		}
		writeJSON(w, http.StatusOK, map[string][]FeedPost{"posts": posts})
		return
	}

	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input struct {
		Body string `json:"body"`
		Mood string `json:"mood"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	post, err := h.Service.CreatePost(r.Context(), userID, input.Body, input.Mood)
	if err != nil {
		writeError(w, http.StatusBadRequest, publicError(err))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]FeedPost{"post": post})
}

func (h *Handler) HandleProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		profile, err := h.Service.Profile(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load profile")
			return
		}
		writeJSON(w, http.StatusOK, profile)
	case http.MethodPatch:
		var input struct {
			Name     string `json:"name"`
			Bio      string `json:"bio"`
			Headline string `json:"headline"`
			Location string `json:"location"`
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		profile, err := h.Service.UpdateProfile(r.Context(), userID, input.Name, input.Bio, input.Headline, input.Location)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		writeJSON(w, http.StatusOK, profile)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) HandleLive(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	index, err := h.Service.LiveIndex(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load live rooms")
		return
	}
	writeJSON(w, http.StatusOK, index)
}

func (h *Handler) HandleLiveRate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	var input struct {
		LiveRoomID int64 `json:"liveRoomId"`
		Score      int   `json:"score"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	rating, err := h.Service.RateLiveRoom(r.Context(), userID, input.LiveRoomID, input.Score)
	if err != nil {
		writeError(w, http.StatusBadRequest, publicError(err))
		return
	}
	writeJSON(w, http.StatusOK, rating)
}

func (h *Handler) HandleComments(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		targetType := r.URL.Query().Get("targetType")
		targetID, err := strconv.ParseInt(r.URL.Query().Get("targetId"), 10, 64)
		if err != nil || targetID <= 0 {
			writeError(w, http.StatusBadRequest, "targetId is required")
			return
		}
		comments, err := h.Service.ListComments(r.Context(), targetType, targetID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load comments")
			return
		}
		writeJSON(w, http.StatusOK, map[string][]CommentResponse{"comments": comments})
	case http.MethodPost:
		var input struct {
			TargetType string `json:"targetType"`
			TargetID   int64  `json:"targetId"`
			Body       string `json:"body"`
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		comment, err := h.Service.CreateComment(r.Context(), userID, input.TargetType, input.TargetID, input.Body)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		writeJSON(w, http.StatusCreated, map[string]CommentResponse{"comment": comment})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) HandleChats(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	if r.Method == http.MethodPost {
		var input struct {
			Type           string  `json:"type"`
			Title          string  `json:"title"`
			ParticipantIDs []int64 `json:"participantIds"`
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		room, err := h.Service.CreateChatRoom(r.Context(), userID, input.Type, input.Title, input.ParticipantIDs)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		writeJSON(w, http.StatusCreated, map[string]ChatContact{"room": room})
		return
	}

	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	contacts, err := h.Service.ListChatContacts(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load chats")
		return
	}
	writeJSON(w, http.StatusOK, map[string][]ChatContact{"contacts": contacts})
}

func (h *Handler) HandleUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	users, err := h.Service.ListChatUsers(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load users")
		return
	}
	writeJSON(w, http.StatusOK, map[string][]ChatUser{"users": users})
}

func (h *Handler) HandleChatParticipants(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	var input struct {
		RoomID         string  `json:"roomId"`
		ParticipantIDs []int64 `json:"participantIds"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	room, err := h.Service.AddUsersToRoom(r.Context(), userID, input.RoomID, input.ParticipantIDs)
	if err != nil {
		writeError(w, http.StatusBadRequest, publicError(err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]ChatContact{"room": room})
}

func (h *Handler) HandleChatMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		roomID := firstNonBlank(r.URL.Query().Get("roomId"), r.URL.Query().Get("contactId"))
		messages, err := h.Service.ListChatMessages(r.Context(), userID, roomID)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		writeJSON(w, http.StatusOK, map[string][]ChatMessage{"messages": messages})
	case http.MethodPost:
		var input struct {
			ContactID string `json:"contactId"`
			RoomID    string `json:"roomId"`
			Body      string `json:"body"`
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		roomID := firstNonBlank(input.RoomID, input.ContactID)
		message, err := h.Service.SendChatMessage(r.Context(), userID, roomID, input.Body)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		writeJSON(w, http.StatusCreated, map[string]ChatMessage{"message": message})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) requireUser(w http.ResponseWriter, r *http.Request) (int64, bool) {
	claims, err := claimsFromRequest(r, h.JWTSecret, h.JWTIssuer)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return 0, false
	}
	return claims.Subject, true
}

func (h *Handler) writeAuthResponse(w http.ResponseWriter, status int, user User) {
	token, err := createToken(user, h.JWTSecret, h.JWTIssuer)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}
	writeJSON(w, status, AuthResponse{Token: token, User: toAuthUser(user)})
}

func minioIsUp(ctx context.Context, healthURL string) bool {
	if healthURL == "" {
		return false
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
	if err != nil {
		return false
	}
	response, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	return response.StatusCode >= 200 && response.StatusCode < 300
}

func (h *Handler) redirectGoogleError(w http.ResponseWriter, r *http.Request, code string) {
	if wantsJSON(r) {
		writeError(w, http.StatusBadRequest, code)
		return
	}
	values := url.Values{}
	values.Set("auth_error", code)
	http.Redirect(w, r, frontendOrigin()+"/?"+values.Encode(), http.StatusTemporaryRedirect)
}

func frontendOrigin() string {
	return valueOrDefault("FRONTEND_ORIGIN", "http://localhost:5173")
}

func firstNonBlank(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
