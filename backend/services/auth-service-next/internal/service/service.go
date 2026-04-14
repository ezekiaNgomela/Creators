package service

import (
	"context"
	"errors"
	"fmt"
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
	state := uuid.NewString()
	return s.oauth2Conf.AuthCodeURL(state, oauth2.AccessTypeOffline), nil
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
