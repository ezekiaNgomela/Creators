package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type TokenClaims struct {
	Subject int64
	Email   string
	Name    string
}

type jwtPayload struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Issuer  string `json:"iss"`
	Issued  int64  `json:"iat"`
	Expires int64  `json:"exp"`
}

func valueOrDefault(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"message": message})
}

func decodeJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func isAllowedOrigin(origin string) bool {
	for _, allowed := range frontendOrigins() {
		if origin == allowed {
			return true
		}
	}

	parsed, err := url.Parse(origin)
	if err == nil {
		host := strings.ToLower(parsed.Hostname())
		if parsed.Scheme == "https" && (host == "onrender.com" || strings.HasSuffix(host, ".onrender.com")) {
			return true
		}
	}

	return strings.HasPrefix(origin, "http://localhost:") ||
		strings.HasPrefix(origin, "http://127.0.0.1:") ||
		strings.HasPrefix(origin, "http://192.168.")
}

func frontendOrigins() []string {
	configured := valueOrDefault("FRONTEND_ORIGIN", "http://localhost:5173")
	origins := make([]string, 0, 2)
	for _, value := range strings.Split(configured, ",") {
		value = strings.TrimSpace(strings.TrimRight(value, "/"))
		if value != "" {
			origins = append(origins, value)
		}
	}
	return origins
}

func createToken(user User, secret string, issuer string) (string, error) {
	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	now := time.Now().UTC()
	payload := jwtPayload{
		Subject: strconv.FormatInt(user.ID, 10),
		Email:   user.Email,
		Name:    user.Name,
		Issuer:  issuer,
		Issued:  now.Unix(),
		Expires: now.Add(7 * 24 * time.Hour).Unix(),
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	unsigned := base64.RawURLEncoding.EncodeToString(headerJSON) + "." + base64.RawURLEncoding.EncodeToString(payloadJSON)
	return unsigned + "." + signJWT(unsigned, secret), nil
}

func claimsFromRequest(r *http.Request, secret string, issuer string) (TokenClaims, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return TokenClaims{}, errors.New("missing authorization header")
	}

	kind, token, ok := strings.Cut(auth, " ")
	if !ok || !strings.EqualFold(kind, "Bearer") || token == "" {
		return TokenClaims{}, errors.New("invalid authorization header")
	}

	return parseToken(token, secret, issuer)
}

func parseToken(token string, secret string, issuer string) (TokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return TokenClaims{}, errors.New("invalid token")
	}

	unsigned := parts[0] + "." + parts[1]
	expected := signJWT(unsigned, secret)
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return TokenClaims{}, errors.New("invalid token signature")
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return TokenClaims{}, err
	}
	var payload jwtPayload
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return TokenClaims{}, err
	}
	if payload.Issuer != issuer {
		return TokenClaims{}, errors.New("invalid token issuer")
	}
	if payload.Expires < time.Now().UTC().Unix() {
		return TokenClaims{}, errors.New("token expired")
	}
	subject, err := strconv.ParseInt(payload.Subject, 10, 64)
	if err != nil {
		return TokenClaims{}, err
	}

	return TokenClaims{Subject: subject, Email: payload.Email, Name: payload.Name}, nil
}

func signJWT(unsigned string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(unsigned))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
