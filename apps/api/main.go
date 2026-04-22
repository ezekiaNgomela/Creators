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
