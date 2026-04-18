package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"creators/backend/services/auth-service-next/internal/config"
	"creators/backend/services/auth-service-next/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	googleoauth "golang.org/x/oauth2/google"
)

type Service struct {
	cfg        config.Config
	repo       *repository.Repository
	oauth2Conf *oauth2.Config
}

type googleStateClaims struct {
	Redirect string `json:"redirect"`
	jwt.RegisteredClaims
}

type GoogleUserInfo struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
}

type RegisterUserRequest struct {
	Username string `json:"username" binding:"required,min=3"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type RegisterSuperUserRequest struct {
	Username    string `json:"username" binding:"required,min=3"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	PlanBilling string `json:"planBilling" binding:"required,oneof=monthly yearly"`
	ChannelName string `json:"channelName" binding:"required"`
	DisplayName string `json:"displayName" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token                string                 `json:"token"`
	User                 repository.User        `json:"user"`
	RequiresVerification bool                   `json:"requiresVerification"`
	Meta                 map[string]interface{} `json:"meta,omitempty"`
}

func New(cfg config.Config, repo *repository.Repository) *Service {
	svc := &Service{cfg: cfg, repo: repo}
	if cfg.GoogleClientID != "" && cfg.GoogleClientSecret != "" {
		svc.oauth2Conf = &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.GoogleRedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     googleoauth.Endpoint,
		}
	}
	return svc
}

func (s *Service) RegisterUser(ctx context.Context, req RegisterUserRequest) (AuthResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResponse{}, err
	}

	user, err := s.repo.CreateUser(ctx, repository.CreateUserParams{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         "user",
		IsVerified:   true,
	})
	if err != nil {
		return AuthResponse{}, err
	}

	token, err := s.issueJWT(user)
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{Token: token, User: user}, nil
}

func (s *Service) RegisterSuperUser(ctx context.Context, req RegisterSuperUserRequest) (AuthResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResponse{}, err
	}

	user, err := s.repo.CreateUser(ctx, repository.CreateUserParams{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         "super_user",
		IsVerified:   false,
	})
	if err != nil {
		return AuthResponse{}, err
	}

	if err := s.repo.CreateSuperUserProfile(ctx, repository.CreateSuperUserProfileParams{
		UserID:      user.ID,
		DisplayName: req.DisplayName,
		ChannelName: req.ChannelName,
		PlanBilling: req.PlanBilling,
	}); err != nil {
		return AuthResponse{}, err
	}

	verificationToken := uuid.NewString()
	if err := s.repo.CreateEmailVerificationToken(ctx, user.ID, verificationToken, time.Now().Add(48*time.Hour)); err != nil {
		return AuthResponse{}, err
	}

	token, err := s.issueJWT(user)
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{
		Token:                token,
		User:                 user,
		RequiresVerification: true,
		Meta: map[string]interface{}{
			"verificationToken": verificationToken,
			"planBilling":       req.PlanBilling,
			"note":              "send verification token by email transport next",
		},
	}, nil
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (AuthResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return AuthResponse{}, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return AuthResponse{}, errors.New("invalid credentials")
	}

	if user.Role == "super_user" && !user.IsVerified {
		return AuthResponse{}, errors.New("super user must verify email before login")
	}

	token, err := s.issueJWT(user)
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{Token: token, User: user}, nil
}

func (s *Service) VerifyEmail(ctx context.Context, token string) error {
	return s.repo.VerifyEmailByToken(ctx, token)
}

func (s *Service) Me(ctx context.Context, tokenString string) (repository.User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return repository.User{}, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return repository.User{}, errors.New("invalid token claims")
	}

	subject, _ := claims["sub"].(string)
	if subject == "" {
		return repository.User{}, errors.New("missing subject")
	}

	return s.repo.GetUserByID(ctx, subject)
}

func (s *Service) GoogleAuthURL() (string, error) {
	if s.oauth2Conf == nil {
		return "", errors.New("google oauth is not configured")
	}

	state, err := s.issueGoogleState()
	if err != nil {
		return "", err
	}

	return s.oauth2Conf.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "select_account")), nil
}

func (s *Service) HandleGoogleCallback(ctx context.Context, code string, state string, providerError string, providerErrorDescription string) (string, error) {
	if strings.TrimSpace(providerError) != "" {
		message := "Google sign-in was cancelled."
		if strings.TrimSpace(providerErrorDescription) != "" {
			message = providerErrorDescription
		}
		return s.googleErrorRedirect(message), fmt.Errorf("google oauth returned %q", providerError)
	}
	if s.oauth2Conf == nil {
		return s.googleErrorRedirect("Google sign-in is not configured."), errors.New("google oauth is not configured")
	}
	if strings.TrimSpace(code) == "" {
		return s.googleErrorRedirect("Missing Google authorization code."), errors.New("missing google authorization code")
	}

	redirectTarget, err := s.parseGoogleState(state)
	if err != nil {
		return s.googleErrorRedirect("Invalid Google sign-in state."), err
	}

	token, err := s.oauth2Conf.Exchange(ctx, code)
	if err != nil {
		return s.googleErrorRedirect("Google code exchange failed."), err
	}

	profile, err := s.fetchGoogleUserInfo(ctx, token.AccessToken)
	if err != nil {
		return s.googleErrorRedirect("Unable to read your Google profile."), err
	}

	authResponse, err := s.loginOrCreateGoogleUser(ctx, profile)
	if err != nil {
		return s.googleErrorRedirect("Unable to create your Google session."), err
	}

	redirectURL, err := buildGoogleSuccessRedirect(redirectTarget, authResponse)
	if err != nil {
		return s.googleErrorRedirect("Unable to finish Google sign-in."), err
	}

	return redirectURL, nil
}

func (s *Service) issueGoogleState() (string, error) {
	redirectTarget := strings.TrimRight(s.cfg.FrontendURL, "/") + "/sign-in"
	claims := googleStateClaims{
		Redirect: redirectTarget,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.cfg.JWTIssuer,
			Subject:   "google-oauth-state",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        uuid.NewString(),
			Audience:  []string{"creators-google-oauth"},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *Service) parseGoogleState(state string) (string, error) {
	if strings.TrimSpace(state) == "" {
		return "", errors.New("missing google state")
	}

	token, err := jwt.ParseWithClaims(state, &googleStateClaims{}, func(parsed *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("invalid google state")
	}

	claims, ok := token.Claims.(*googleStateClaims)
	if !ok || claims.Redirect == "" {
		return "", errors.New("invalid google state claims")
	}

	return claims.Redirect, nil
}

func (s *Service) fetchGoogleUserInfo(ctx context.Context, accessToken string) (GoogleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://openidconnect.googleapis.com/v1/userinfo", nil)
	if err != nil {
		return GoogleUserInfo{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return GoogleUserInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return GoogleUserInfo{}, fmt.Errorf("google user info returned status %d", resp.StatusCode)
	}

	var profile GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return GoogleUserInfo{}, err
	}
	if profile.Subject == "" || profile.Email == "" {
		return GoogleUserInfo{}, errors.New("google user info is incomplete")
	}

	return profile, nil
}

func (s *Service) loginOrCreateGoogleUser(ctx context.Context, profile GoogleUserInfo) (AuthResponse, error) {
	user, err := s.repo.GetUserByOAuthAccount(ctx, "google", profile.Subject)
	switch {
	case err == nil:
		return s.buildOAuthAuthResponse(user)
	case !repository.IsNotFound(err):
		return AuthResponse{}, err
	}

	user, err = s.repo.GetUserByEmail(ctx, profile.Email)
	switch {
	case err == nil:
		if profile.EmailVerified && !user.IsVerified {
			if err := s.repo.MarkUserVerified(ctx, user.ID); err != nil {
				return AuthResponse{}, err
			}
			user.IsVerified = true
		}
	case repository.IsNotFound(err):
		user, err = s.createGoogleUser(ctx, profile)
		if err != nil {
			return AuthResponse{}, err
		}
	default:
		return AuthResponse{}, err
	}

	if err := s.repo.UpsertOAuthAccount(ctx, repository.OAuthAccountParams{
		UserID:         user.ID,
		Provider:       "google",
		ProviderUserID: profile.Subject,
		ProviderEmail:  profile.Email,
	}); err != nil {
		return AuthResponse{}, err
	}

	return s.buildOAuthAuthResponse(user)
}

func (s *Service) createGoogleUser(ctx context.Context, profile GoogleUserInfo) (repository.User, error) {
	randomPassword := uuid.NewString()
	hash, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
	if err != nil {
		return repository.User{}, err
	}

	baseUsername := buildGoogleUsername(profile)
	for attempt := 0; attempt < 5; attempt++ {
		username := baseUsername
		if attempt > 0 {
			username = fmt.Sprintf("%s%d", baseUsername, attempt+1)
		}

		user, err := s.repo.CreateUser(ctx, repository.CreateUserParams{
			Username:     username,
			Email:        profile.Email,
			PasswordHash: string(hash),
			Role:         "user",
			IsVerified:   profile.EmailVerified,
		})
		if err == nil {
			return user, nil
		}
		if !strings.Contains(strings.ToLower(err.Error()), "duplicate") && !strings.Contains(strings.ToLower(err.Error()), "unique") {
			return repository.User{}, err
		}
	}

	return repository.User{}, errors.New("could not allocate username for google account")
}

func (s *Service) buildOAuthAuthResponse(user repository.User) (AuthResponse, error) {
	token, err := s.issueJWT(user)
	if err != nil {
		return AuthResponse{}, err
	}
	return AuthResponse{Token: token, User: user}, nil
}

func buildGoogleSuccessRedirect(redirectTarget string, response AuthResponse) (string, error) {
	payload, err := json.Marshal(response)
	if err != nil {
		return "", err
	}

	target, err := url.Parse(redirectTarget)
	if err != nil {
		return "", err
	}

	query := target.Query()
	query.Set("auth", base64.RawURLEncoding.EncodeToString(payload))
	query.Set("provider", "google")
	target.RawQuery = query.Encode()
	return target.String(), nil
}

func buildGoogleUsername(profile GoogleUserInfo) string {
	base := profile.GivenName
	if strings.TrimSpace(base) == "" {
		base = strings.Split(profile.Email, "@")[0]
	}

	base = strings.ToLower(strings.TrimSpace(base))
	base = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= '0' && r <= '9':
			return r
		default:
			return -1
		}
	}, base)

	if len(base) < 3 {
		base = "user" + uuid.NewString()[:6]
	}

	if len(base) > 18 {
		base = base[:18]
	}

	return base
}

func (s *Service) googleErrorRedirect(message string) string {
	target, err := url.Parse(strings.TrimRight(s.cfg.FrontendURL, "/") + "/sign-in")
	if err != nil {
		return strings.TrimRight(s.cfg.FrontendURL, "/") + "/sign-in"
	}
	query := target.Query()
	query.Set("oauthError", message)
	target.RawQuery = query.Encode()
	return target.String()
}

func (s *Service) issueJWT(user repository.User) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"role":  user.Role,
		"iss":   s.cfg.JWTIssuer,
		"iat":   now.Unix(),
		"exp":   now.Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *Service) PricingExamples() map[string]string {
	return map[string]string{
		"coinValue":     "10 coins = 1 USD",
		"streamExample": "30 minutes = 10 coins",
		"revenueSplit":  fmt.Sprintf("%d%% creator, %d%% platform, %d%% reserve", 80, 10, 10),
	}
}
