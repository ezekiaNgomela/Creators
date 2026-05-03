package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type Handler struct {
	Service        *DataService
	Redis          *redis.Client
	MinioHealthURL string
	UploadDir      string
	Renderer       *StudioRenderer
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
		if idValue := strings.TrimSpace(r.URL.Query().Get("id")); idValue != "" {
			postID, err := strconv.ParseInt(idValue, 10, 64)
			if err != nil || postID <= 0 {
				writeError(w, http.StatusBadRequest, "invalid post id")
				return
			}
			post, err := h.Service.FindPost(r.Context(), postID)
			if err != nil {
				writeError(w, http.StatusNotFound, "post not found")
				return
			}
			writeJSON(w, http.StatusOK, map[string]FeedPost{"post": post})
			return
		}

		posts, err := h.Service.ListPosts(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load posts")
			return
		}
		writeJSON(w, http.StatusOK, map[string][]FeedPost{"posts": posts})
		return
	}

	if r.Method == http.MethodPatch {
		var input struct {
			ID int64 `json:"id"`
			PostInput
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		post, err := h.Service.UpdatePost(r.Context(), userID, input.ID, input.PostInput)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		notification, err := h.Service.CreateNotification(r.Context(), userID, "Post updated", "Your profile edit is live on the home feed.", "post", "/profile")
		if err == nil {
			h.publishRealtime(r.Context(), userID, "notification", notification)
		}
		writeJSON(w, http.StatusOK, map[string]FeedPost{"post": post})
		return
	}

	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input PostInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	post, err := h.Service.CreatePost(r.Context(), userID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, publicError(err))
		return
	}
	notification, err := h.Service.CreateNotification(r.Context(), userID, "Post published", "Your Studio edit is live on your profile.", "post", "/studio")
	if err == nil {
		h.publishRealtime(r.Context(), userID, "notification", notification)
	}
	writeJSON(w, http.StatusCreated, map[string]FeedPost{"post": post})
}

func (h *Handler) HandleMediaUpload(w http.ResponseWriter, r *http.Request) {
	_, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	const mediaUploadLimit = 250 << 20
	r.Body = http.MaxBytesReader(w, r.Body, mediaUploadLimit)
	if err := r.ParseMultipartForm(mediaUploadLimit); err != nil {
		writeError(w, http.StatusBadRequest, "media upload must be smaller than 250MB")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		writeError(w, http.StatusBadRequest, "could not read file")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		writeError(w, http.StatusBadRequest, "could not read file")
		return
	}
	extension := strings.ToLower(filepath.Ext(header.Filename))
	if extension == "" {
		extension = extensionForMime(http.DetectContentType(buffer[:n]))
	}
	if !allowedMediaExtension(extension) {
		writeError(w, http.StatusBadRequest, "unsupported media extension")
		return
	}
	mimeType := mimeTypeForExtension(extension)
	detectedMimeType := http.DetectContentType(buffer[:n])
	if mimeType == "application/octet-stream" {
		mimeType = detectedMimeType
	}
	mediaType := mediaCategory(mimeType, extension)
	if mediaType == "" {
		writeError(w, http.StatusBadRequest, "only image, video, and audio files are supported")
		return
	}

	uploadDir := valueOrDefault("UPLOAD_DIR", h.UploadDir)
	if uploadDir == "" {
		uploadDir = "uploads"
	}
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, "could not prepare media storage")
		return
	}
	fileName := randomFileName(extension)
	destination, err := os.Create(filepath.Join(uploadDir, fileName))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save media")
		return
	}
	defer destination.Close()
	if _, err := io.Copy(destination, file); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save media")
		return
	}

	writeJSON(w, http.StatusCreated, MediaUploadResponse{
		URL:       strings.TrimRight(requestBaseURL(r), "/") + "/uploads/" + fileName,
		MediaType: mediaType,
		MimeType:  mimeType,
		FileName:  fileName,
	})
}

func (h *Handler) HandleStudioRender(w http.ResponseWriter, r *http.Request) {
	_, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	renderer := h.studioRenderer()

	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, renderer.Health(r.Context()))
	case http.MethodPost:
		var input StudioRenderInput
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid render request body")
			return
		}
		job, err := renderer.Start(r.Context(), input)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]StudioRenderJob{"job": h.absoluteRenderJob(r, job)})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) HandleStudioRenderJob(w http.ResponseWriter, r *http.Request) {
	_, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	jobID := strings.TrimSpace(r.URL.Query().Get("id"))
	if jobID == "" {
		writeError(w, http.StatusBadRequest, "render job id is required")
		return
	}
	job, found := h.studioRenderer().Find(jobID)
	if !found {
		writeError(w, http.StatusNotFound, "render job not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]StudioRenderJob{"job": h.absoluteRenderJob(r, job)})
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
			Name       string `json:"name"`
			Bio        string `json:"bio"`
			Headline   string `json:"headline"`
			Location   string `json:"location"`
			AvatarURL  string `json:"avatarUrl"`
			CoverURL   string `json:"coverUrl"`
			WebsiteURL string `json:"websiteUrl"`
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		profile, err := h.Service.UpdateProfile(r.Context(), userID, input.Name, input.Bio, input.Headline, input.Location, input.AvatarURL, input.CoverURL, input.WebsiteURL)
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

func (h *Handler) HandleNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		notifications, err := h.Service.ListNotifications(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load notifications")
			return
		}
		writeJSON(w, http.StatusOK, map[string][]Notification{"notifications": notifications})
	case http.MethodPatch:
		if err := h.Service.MarkNotificationsRead(r.Context(), userID); err != nil {
			writeError(w, http.StatusInternalServerError, "could not update notifications")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) HandleCalls(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		callID, err := strconv.ParseInt(r.URL.Query().Get("id"), 10, 64)
		if err != nil || callID <= 0 {
			writeError(w, http.StatusBadRequest, "valid call id is required")
			return
		}
		call, err := h.Service.FindCallSession(r.Context(), userID, callID)
		if err != nil {
			writeError(w, http.StatusNotFound, "call session not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]CallSession{"call": call})
	case http.MethodPost:
		var input struct {
			RoomID string `json:"roomId"`
			Mode   string `json:"mode"`
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		call, err := h.Service.CreateCallSession(r.Context(), userID, input.RoomID, input.Mode)
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		for _, participant := range call.Participants {
			if participant.ID == userID {
				continue
			}
			notification, err := h.Service.CreateNotification(
				r.Context(),
				participant.ID,
				"Incoming "+call.Mode+" call",
				call.CreatedBy.Name+" invited you to a protected call room.",
				"call",
				"/calls?id="+strconv.FormatInt(call.ID, 10),
			)
			if err == nil {
				h.publishRealtime(r.Context(), participant.ID, "notification", notification)
			}
			h.publishRealtime(r.Context(), participant.ID, "call_invite", call)
		}
		writeJSON(w, http.StatusCreated, map[string]CallSession{"call": call})
	case http.MethodPatch:
		var input struct {
			ID     int64  `json:"id"`
			Action string `json:"action"`
		}
		if err := decodeJSON(r, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		var (
			call CallSession
			err  error
		)
		switch input.Action {
		case "join":
			call, err = h.Service.JoinCallSession(r.Context(), userID, input.ID)
		case "end", "leave":
			call, err = h.Service.EndCallSession(r.Context(), userID, input.ID)
		default:
			writeError(w, http.StatusBadRequest, "action must be join, leave, or end")
			return
		}
		if err != nil {
			writeError(w, http.StatusBadRequest, publicError(err))
			return
		}
		for _, participant := range call.Participants {
			h.publishRealtime(r.Context(), participant.ID, "call_update", call)
		}
		writeJSON(w, http.StatusOK, map[string]CallSession{"call": call})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
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

func (h *Handler) HandleChatReactions(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input struct {
		MessageID int64  `json:"messageId"`
		Emoji     string `json:"emoji"`
		Action    string `json:"action"` // "add" or "remove"
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Implement logic in service to add/remove reaction
	// For brevity, assuming a simple exec here
	if input.Action == "add" {
		_, _ = h.Service.Pool.Exec(r.Context(), `
			INSERT INTO chat_room_reactions (message_id, user_id, emoji)
			VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, input.MessageID, userID, input.Emoji)
	} else {
		_, _ = h.Service.Pool.Exec(r.Context(), `
			DELETE FROM chat_room_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
			input.MessageID, userID, input.Emoji)
	}

	h.publishRealtime(r.Context(), userID, "chat_reaction", map[string]any{
		"messageId": input.MessageID,
		"emoji":     input.Emoji,
		"userId":    userID,
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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
		participants, err := h.Service.ListChatParticipants(r.Context(), message.RoomID)
		if err == nil {
			for _, participant := range participants {
				delivery := message
				delivery.Own = participant.ID == message.Sender.ID
				h.publishRealtime(r.Context(), participant.ID, "chat_message", delivery)
				if participant.ID == userID {
					continue
				}
				notification, notifyErr := h.Service.CreateNotification(
					r.Context(),
					participant.ID,
					"New chat message",
					chatNotificationBody(message),
					"chat",
					"/conversations/"+message.RoomID,
				)
				if notifyErr == nil {
					h.publishRealtime(r.Context(), participant.ID, "notification", notification)
				}
			}
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

func (h *Handler) studioRenderer() *StudioRenderer {
	if h.Renderer == nil {
		h.Renderer = NewStudioRenderer(valueOrDefault("UPLOAD_DIR", h.UploadDir))
	}
	return h.Renderer
}

func (h *Handler) absoluteRenderJob(r *http.Request, job StudioRenderJob) StudioRenderJob {
	if job.OutputURL == "" || strings.HasPrefix(job.OutputURL, "http://") || strings.HasPrefix(job.OutputURL, "https://") {
		return job
	}
	job.OutputURL = strings.TrimRight(requestBaseURL(r), "/") + "/" + strings.TrimLeft(job.OutputURL, "/")
	return job
}

func requestBaseURL(r *http.Request) string {
	if baseURL := valueOrDefault("PUBLIC_BASE_URL", ""); baseURL != "" {
		return baseURL
	}
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + r.Host
}

func firstNonBlank(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func extensionForMime(mimeType string) string {
	switch mimeType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "video/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	case "video/quicktime":
		return ".mov"
	case "audio/mpeg":
		return ".mp3"
	case "audio/wav", "audio/x-wav":
		return ".wav"
	case "audio/aac":
		return ".aac"
	case "audio/flac":
		return ".flac"
	case "audio/ogg", "application/ogg":
		return ".ogg"
	default:
		return ".bin"
	}
}

func mimeTypeForExtension(extension string) string {
	switch strings.ToLower(extension) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".mp4":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".webm":
		return "video/webm"
	case ".mkv":
		return "video/x-matroska"
	case ".mp3":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	case ".aac":
		return "audio/aac"
	case ".flac":
		return "audio/flac"
	case ".m4a":
		return "audio/mp4"
	case ".ogg":
		return "audio/ogg"
	default:
		return "application/octet-stream"
	}
}

func mediaCategory(mimeType string, extension string) string {
	if strings.HasPrefix(mimeType, "image/") {
		return "image"
	}
	if strings.HasPrefix(mimeType, "video/") {
		return "video"
	}
	if strings.HasPrefix(mimeType, "audio/") {
		return "audio"
	}
	switch strings.ToLower(extension) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return "image"
	case ".mp4", ".mov", ".webm", ".mkv":
		return "video"
	case ".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg":
		return "audio"
	default:
		return ""
	}
}

func allowedMediaExtension(extension string) bool {
	switch strings.ToLower(extension) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".webm", ".mkv", ".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg":
		return true
	default:
		return false
	}
}

func randomFileName(extension string) string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36) + extension
	}
	return hex.EncodeToString(buffer) + extension
}

func (h *Handler) publishRealtime(ctx context.Context, userID int64, eventType string, payload any) {
	if h.Redis == nil {
		return
	}
	message, err := json.Marshal(map[string]any{
		"type": eventType,
		"data": payload,
	})
	if err != nil {
		return
	}
	_ = h.Redis.Publish(ctx, realtimeUserChannel(userID), message).Err()
}

func chatNotificationBody(message ChatMessage) string {
	body := strings.TrimSpace(message.Body)
	if len(body) > 80 {
		body = body[:77] + "..."
	}
	if body == "" {
		body = "Sent a message."
	}
	return message.Sender.Name + ": " + body
}
