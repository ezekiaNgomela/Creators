package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const oauthStateCookieName = "creators_google_state"

type googleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
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

func googleConfigFromEnv() googleConfig {
	return googleConfig{
		ClientID:     strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID")),
		ClientSecret: strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET")),
		RedirectURL:  valueOrDefault("GOOGLE_REDIRECT_URL", "http://localhost:18000/api/auth/google/callback"),
	}
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

func (h *Handler) exchangeGoogleCode(ctx context.Context, code string, config googleConfig) (googleProfile, error) {
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", config.ClientID)
	form.Set("client_secret", config.ClientSecret)
	form.Set("redirect_uri", config.RedirectURL)
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
		return googleProfile{}, fmt.Errorf("Google token status %d: %s", tokenResponse.StatusCode, string(body))
	}

	var tokens googleTokenResponse
	if err := json.NewDecoder(tokenResponse.Body).Decode(&tokens); err != nil {
		return googleProfile{}, err
	}
	if tokens.AccessToken == "" {
		return googleProfile{}, errors.New("missing Google access token")
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
		return googleProfile{}, fmt.Errorf("Google profile status %d: %s", profileResponse.StatusCode, string(body))
	}

	var profile googleProfile
	if err := json.NewDecoder(profileResponse.Body).Decode(&profile); err != nil {
		return googleProfile{}, err
	}
	if profile.Sub == "" || !validEmail(profile.Email) {
		return googleProfile{}, errors.New("Google profile is missing a verified identity")
	}
	return profile, nil
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

func setOAuthStateCookie(w http.ResponseWriter, state string) {
	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookieName,
		Value:    state,
		Path:     "/",
		MaxAge:   10 * 60,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func clearOAuthStateCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}
