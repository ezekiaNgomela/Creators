package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

type User struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	Status       string `json:"status"`
	IsVerified   bool   `json:"isVerified"`
	PasswordHash string `json:"-"`
}

type CreateUserParams struct {
	Username     string
	Email        string
	PasswordHash string
	Role         string
	IsVerified   bool
}

type CreateSuperUserProfileParams struct {
	UserID      string
	DisplayName string
	ChannelName string
	PlanBilling string
}

type OAuthAccountParams struct {
	UserID         string
	Provider       string
	ProviderUserID string
	ProviderEmail  string
}

func New(ctx context.Context, databaseURL string) (*Repository, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}

	repo := &Repository{pool: pool}
	if err := repo.ApplyMigrations(ctx); err != nil {
		repo.Close()
		return nil, err
	}

	return repo, nil
}

func (r *Repository) Close() {
	if r != nil && r.pool != nil {
		r.pool.Close()
	}
}

func (r *Repository) CreateUser(ctx context.Context, params CreateUserParams) (User, error) {
	query := `
		INSERT INTO users (username, email, password_hash, role, is_verified)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, username, email, role, status, is_verified, password_hash
	`
	var user User
	err := r.pool.QueryRow(ctx, query,
		params.Username,
		params.Email,
		params.PasswordHash,
		params.Role,
		params.IsVerified,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Role,
		&user.Status,
		&user.IsVerified,
		&user.PasswordHash,
	)
	return user, err
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (User, error) {
	query := `
		SELECT id::text, username, email, role, status, is_verified, password_hash
		FROM users
		WHERE email = $1
	`
	var user User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Role,
		&user.Status,
		&user.IsVerified,
		&user.PasswordHash,
	)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (User, error) {
	query := `
		SELECT id::text, username, email, role, status, is_verified, password_hash
		FROM users
		WHERE id = $1
	`
	var user User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Role,
		&user.Status,
		&user.IsVerified,
		&user.PasswordHash,
	)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (r *Repository) GetUserByOAuthAccount(ctx context.Context, provider string, providerUserID string) (User, error) {
	query := `
		SELECT u.id::text, u.username, u.email, u.role, u.status, u.is_verified, u.password_hash
		FROM oauth_accounts oa
		INNER JOIN users u ON u.id = oa.user_id
		WHERE oa.provider = $1 AND oa.provider_user_id = $2
	`
	var user User
	err := r.pool.QueryRow(ctx, query, provider, providerUserID).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Role,
		&user.Status,
		&user.IsVerified,
		&user.PasswordHash,
	)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (r *Repository) CreateEmailVerificationToken(ctx context.Context, userID string, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO verification_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)
	`
	_, err := r.pool.Exec(ctx, query, userID, token, expiresAt)
	return err
}

func (r *Repository) VerifyEmailByToken(ctx context.Context, token string) error {
	var userID string
	lookup := `
		SELECT user_id::text
		FROM verification_tokens
		WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
		LIMIT 1
	`
	if err := r.pool.QueryRow(ctx, lookup, token).Scan(&userID); err != nil {
		return errors.New("invalid or expired verification token")
	}

	if _, err := r.pool.Exec(ctx, `UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`, userID); err != nil {
		return err
	}

	_, err := r.pool.Exec(ctx, `UPDATE verification_tokens SET used_at = NOW() WHERE token = $1`, token)
	return err
}

func (r *Repository) MarkUserVerified(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`, userID)
	return err
}

func (r *Repository) CreateSuperUserProfile(ctx context.Context, params CreateSuperUserProfileParams) error {
	slug := strings.ToLower(strings.Join(strings.Fields(params.ChannelName), "-"))

	query := `
		WITH new_channel AS (
			INSERT INTO creator_channels (super_user_id, name, slug, visibility)
			VALUES ($1, $2, $3, 'private')
			RETURNING id
		)
		INSERT INTO super_user_profiles (user_id, display_name, default_plan_billing, primary_channel_id)
		SELECT $1, $4, $5, id FROM new_channel
	`
	_, err := r.pool.Exec(ctx, query, params.UserID, params.ChannelName, slug, params.DisplayName, params.PlanBilling)
	return err
}

func (r *Repository) UpsertOAuthAccount(ctx context.Context, params OAuthAccountParams) error {
	query := `
		INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (provider, provider_user_id)
		DO UPDATE SET provider_email = EXCLUDED.provider_email
	`
	_, err := r.pool.Exec(ctx, query, params.UserID, params.Provider, params.ProviderUserID, params.ProviderEmail)
	return err
}

func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
