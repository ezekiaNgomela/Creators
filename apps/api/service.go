package main

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type DataService struct {
	Pool *pgxpool.Pool
}

func (s *DataService) Ping(ctx context.Context) error {
	return s.Pool.Ping(ctx)
}

func (s *DataService) CreateUser(ctx context.Context, name string, email string, password string) (User, error) {
	name = strings.TrimSpace(name)
	email = normalizeEmail(email)
	if name == "" {
		return User{}, errors.New("name is required")
	}
	if email == "" {
		return User{}, errors.New("email is required")
	}
	if len(password) < 8 {
		return User{}, errors.New("password must be at least 8 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}

	var user User
	hashText := string(hash)
	err = s.Pool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, provider)
		VALUES ($1, $2, $3, 'email')
		RETURNING id, email, name, provider, password_hash, created_at
	`, email, name, hashText).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return User{}, errors.New("an account with this email already exists")
		}
		return User{}, err
	}

	if err := s.EnsureUserRecords(ctx, user.ID); err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *DataService) Authenticate(ctx context.Context, email string, password string) (User, error) {
	user, err := s.FindUserByEmail(ctx, normalizeEmail(email))
	if err != nil {
		return User{}, errors.New("invalid email or password")
	}
	if user.PasswordHash == nil || *user.PasswordHash == "" {
		return User{}, errors.New("this account uses another sign-in method")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return User{}, errors.New("invalid email or password")
	}
	if err := s.EnsureUserRecords(ctx, user.ID); err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *DataService) UpsertGoogleUser(ctx context.Context, name string, email string, googleSub string) (User, error) {
	name = strings.TrimSpace(name)
	email = normalizeEmail(email)
	googleSub = strings.TrimSpace(googleSub)
	if name == "" {
		name = email
	}
	if email == "" || !validEmail(email) || googleSub == "" {
		return User{}, errors.New("Google profile is missing a verified identity")
	}

	var user User
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO users (email, name, provider, google_sub)
		VALUES ($1, $2, 'google', $3)
		ON CONFLICT (email) DO UPDATE
		SET name = EXCLUDED.name,
			provider = 'google',
			google_sub = EXCLUDED.google_sub
		RETURNING id, email, name, provider, password_hash, created_at
	`, email, name, googleSub).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return User{}, err
	}
	if err := s.EnsureUserRecords(ctx, user.ID); err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *DataService) FindUserByEmail(ctx context.Context, email string) (User, error) {
	var user User
	err := s.Pool.QueryRow(ctx, `
		SELECT id, email, name, provider, password_hash, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.PasswordHash, &user.CreatedAt)
	return user, err
}

func (s *DataService) FindUserByID(ctx context.Context, userID int64) (User, error) {
	var user User
	err := s.Pool.QueryRow(ctx, `
		SELECT id, email, name, provider, password_hash, created_at
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.Name, &user.Provider, &user.PasswordHash, &user.CreatedAt)
	return user, err
}

func (s *DataService) EnsureUserRecords(ctx context.Context, userID int64) error {
	if _, err := s.Pool.Exec(ctx, `
		INSERT INTO user_profiles (user_id, headline)
		VALUES ($1, 'Creator')
		ON CONFLICT (user_id) DO NOTHING
	`, userID); err != nil {
		return err
	}

	starterMessages := []struct {
		Email   string
		Legacy  string
		Body    string
		Minutes int
	}{
		{"alejandro@creators.local", "alejandro-hicks", "I cleaned up the launch checklist. The offer page is ready when you are.", 64},
		{"mika@creators.local", "mika-studio", "Your live teardown room is picking up signups from the new feed.", 37},
		{"noor@creators.local", "noor-creates", "Send me the raw clips and I will turn the replay into a short-form batch.", 22},
	}

	for _, message := range starterMessages {
		contact, err := s.FindUserByEmail(ctx, message.Email)
		if err != nil {
			return err
		}
		roomID, err := s.ensureDirectRoom(ctx, userID, contact.ID, message.Legacy)
		if err != nil {
			return err
		}
		var exists bool
		if err := s.Pool.QueryRow(ctx, `
			SELECT EXISTS (SELECT 1 FROM chat_room_messages WHERE room_id = $1)
		`, roomID).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		if _, err := s.Pool.Exec(ctx, `
			INSERT INTO chat_room_messages (room_id, sender_user_id, body, created_at)
			VALUES ($1, $2, $3, $4)
		`, roomID, contact.ID, message.Body, time.Now().Add(-time.Duration(message.Minutes)*time.Minute)); err != nil {
			return err
		}
	}

	groupID, err := s.ensureGroupRoom(ctx, userID, "Creator launch pod", []string{
		"noor@creators.local",
		"mika@creators.local",
		"alejandro@creators.local",
	})
	if err != nil {
		return err
	}
	var groupHasMessages bool
	if err := s.Pool.QueryRow(ctx, `
		SELECT EXISTS (SELECT 1 FROM chat_room_messages WHERE room_id = $1)
	`, groupID).Scan(&groupHasMessages); err != nil {
		return err
	}
	if !groupHasMessages {
		author, err := s.FindUserByEmail(ctx, "alejandro@creators.local")
		if err != nil {
			return err
		}
		if _, err := s.Pool.Exec(ctx, `
			INSERT INTO chat_room_messages (room_id, sender_user_id, body, created_at)
			VALUES ($1, $2, $3, $4)
		`, groupID, author.ID, "Group room is ready. Add whoever needs the launch context.", time.Now().Add(-11*time.Minute)); err != nil {
			return err
		}
	}

	return nil
}

func (s *DataService) ListPosts(ctx context.Context) ([]FeedPost, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT
			p.id,
			p.body,
			p.mood,
			p.created_at,
			u.id,
			u.email,
			u.name,
			u.provider,
			u.password_hash,
			u.created_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT 50
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]FeedPost, 0)
	for rows.Next() {
		var post FeedPost
		var createdAt time.Time
		var author User
		if err := rows.Scan(
			&post.ID,
			&post.Body,
			&post.Mood,
			&createdAt,
			&author.ID,
			&author.Email,
			&author.Name,
			&author.Provider,
			&author.PasswordHash,
			&author.CreatedAt,
		); err != nil {
			return nil, err
		}
		post.Author = toAuthUser(author)
		post.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

func (s *DataService) CreatePost(ctx context.Context, userID int64, body string, mood string) (FeedPost, error) {
	body = strings.TrimSpace(body)
	mood = strings.TrimSpace(mood)
	if body == "" {
		return FeedPost{}, errors.New("post body is required")
	}
	if mood == "" {
		mood = "Update"
	}

	var postID int64
	if err := s.Pool.QueryRow(ctx, `
		INSERT INTO posts (author_id, body, mood)
		VALUES ($1, $2, $3)
		RETURNING id
	`, userID, body, mood).Scan(&postID); err != nil {
		return FeedPost{}, err
	}
	return s.FindPost(ctx, postID)
}

func (s *DataService) FindPost(ctx context.Context, postID int64) (FeedPost, error) {
	var post FeedPost
	var createdAt time.Time
	var author User
	err := s.Pool.QueryRow(ctx, `
		SELECT
			p.id,
			p.body,
			p.mood,
			p.created_at,
			u.id,
			u.email,
			u.name,
			u.provider,
			u.password_hash,
			u.created_at
		FROM posts p
		JOIN users u ON u.id = p.author_id
		WHERE p.id = $1
	`, postID).Scan(
		&post.ID,
		&post.Body,
		&post.Mood,
		&createdAt,
		&author.ID,
		&author.Email,
		&author.Name,
		&author.Provider,
		&author.PasswordHash,
		&author.CreatedAt,
	)
	if err != nil {
		return FeedPost{}, err
	}
	post.Author = toAuthUser(author)
	post.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	return post, nil
}

func (s *DataService) ListLiveRooms(ctx context.Context) ([]LiveRoom, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, title, host, topic, viewers, starts_at, status, accent, updated_at
		FROM live_rooms
		ORDER BY
			CASE status
				WHEN 'live' THEN 0
				WHEN 'scheduled' THEN 1
				WHEN 'previous' THEN 2
				ELSE 3
			END,
			viewers DESC,
			starts_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rooms := make([]LiveRoom, 0)
	for rows.Next() {
		var room LiveRoom
		if err := rows.Scan(
			&room.ID,
			&room.Title,
			&room.Host,
			&room.Topic,
			&room.Viewers,
			&room.StartsAt,
			&room.Status,
			&room.Accent,
			&room.UpdatedAt,
		); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}
	return rooms, rows.Err()
}

func (s *DataService) LiveIndex(ctx context.Context, userID int64) (LiveIndex, error) {
	rooms, err := s.ListLiveRooms(ctx)
	if err != nil {
		return LiveIndex{}, err
	}

	index := LiveIndex{
		Live:      []LiveRoom{},
		Scheduled: []LiveRoom{},
		Previous:  []LiveRoom{},
		Following: []LiveRoom{},
		Ratings:   []LiveRating{},
	}

	for _, room := range rooms {
		switch room.Status {
		case "live":
			index.Live = append(index.Live, room)
		case "scheduled":
			index.Scheduled = append(index.Scheduled, room)
		case "previous":
			index.Previous = append(index.Previous, room)
		}
		if len(index.Following) < 3 && room.Status != "previous" {
			index.Following = append(index.Following, room)
		}
	}

	ratings, err := s.ListLiveRatings(ctx, userID)
	if err != nil {
		return LiveIndex{}, err
	}
	index.Ratings = ratings
	return index, nil
}

func (s *DataService) ListLiveRatings(ctx context.Context, userID int64) ([]LiveRating, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT
			l.id,
			COALESCE(AVG(r.score), 0)::float8,
			COUNT(r.score)::bigint,
			COALESCE(MAX(CASE WHEN r.user_id = $1 THEN r.score ELSE 0 END), 0)::int
		FROM live_rooms l
		LEFT JOIN live_ratings r ON r.live_room_id = l.id
		GROUP BY l.id
		ORDER BY l.id
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ratings := make([]LiveRating, 0)
	for rows.Next() {
		var rating LiveRating
		if err := rows.Scan(&rating.LiveRoomID, &rating.Average, &rating.Count, &rating.UserScore); err != nil {
			return nil, err
		}
		rating.Average = math.Round(rating.Average*10) / 10
		ratings = append(ratings, rating)
	}
	return ratings, rows.Err()
}

func (s *DataService) RateLiveRoom(ctx context.Context, userID int64, roomID int64, score int) (LiveRating, error) {
	if score < 1 || score > 5 {
		return LiveRating{}, errors.New("rating score must be between 1 and 5")
	}

	tag, err := s.Pool.Exec(ctx, `
		INSERT INTO live_ratings (live_room_id, user_id, score)
		VALUES ($1, $2, $3)
		ON CONFLICT (live_room_id, user_id) DO UPDATE
		SET score = EXCLUDED.score,
			updated_at = now()
	`, roomID, userID, score)
	if err != nil {
		return LiveRating{}, err
	}
	if tag.RowsAffected() == 0 {
		return LiveRating{}, pgx.ErrNoRows
	}

	ratings, err := s.ListLiveRatings(ctx, userID)
	if err != nil {
		return LiveRating{}, err
	}
	for _, rating := range ratings {
		if rating.LiveRoomID == roomID {
			return rating, nil
		}
	}
	return LiveRating{}, pgx.ErrNoRows
}

func (s *DataService) Profile(ctx context.Context, userID int64) (ProfileResponse, error) {
	if err := s.EnsureUserRecords(ctx, userID); err != nil {
		return ProfileResponse{}, err
	}

	var user User
	var profile ProfileResponse
	err := s.Pool.QueryRow(ctx, `
		SELECT
			u.id,
			u.email,
			u.name,
			u.provider,
			u.password_hash,
			u.created_at,
			p.bio,
			p.headline,
			p.location
		FROM users u
		JOIN user_profiles p ON p.user_id = u.id
		WHERE u.id = $1
	`, userID).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Provider,
		&user.PasswordHash,
		&user.CreatedAt,
		&profile.Bio,
		&profile.Headline,
		&profile.Location,
	)
	if err != nil {
		return ProfileResponse{}, err
	}
	profile.User = toAuthUser(user)
	return profile, nil
}

func (s *DataService) UpdateProfile(ctx context.Context, userID int64, name string, bio string, headline string, location string) (ProfileResponse, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return ProfileResponse{}, errors.New("name is required")
	}

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return ProfileResponse{}, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		UPDATE users
		SET name = $2
		WHERE id = $1
	`, userID, name); err != nil {
		return ProfileResponse{}, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_profiles (user_id, bio, headline, location)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE
		SET bio = EXCLUDED.bio,
			headline = EXCLUDED.headline,
			location = EXCLUDED.location,
			updated_at = now()
	`, userID, strings.TrimSpace(bio), strings.TrimSpace(headline), strings.TrimSpace(location)); err != nil {
		return ProfileResponse{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ProfileResponse{}, err
	}

	return s.Profile(ctx, userID)
}

func (s *DataService) ListComments(ctx context.Context, targetType string, targetID int64) ([]CommentResponse, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT
			c.id,
			c.target_id,
			c.target_type,
			c.body,
			c.created_at,
			u.id,
			u.email,
			u.name,
			u.provider,
			u.password_hash,
			u.created_at
		FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.target_type = $1 AND c.target_id = $2
		ORDER BY c.created_at ASC, c.id ASC
	`, targetType, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := make([]CommentResponse, 0)
	for rows.Next() {
		var comment CommentResponse
		var createdAt time.Time
		var author User
		if err := rows.Scan(
			&comment.ID,
			&comment.TargetID,
			&comment.TargetType,
			&comment.Body,
			&createdAt,
			&author.ID,
			&author.Email,
			&author.Name,
			&author.Provider,
			&author.PasswordHash,
			&author.CreatedAt,
		); err != nil {
			return nil, err
		}
		comment.Author = toAuthUser(author)
		comment.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		comments = append(comments, comment)
	}
	return comments, rows.Err()
}

func (s *DataService) CreateComment(ctx context.Context, userID int64, targetType string, targetID int64, body string) (CommentResponse, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return CommentResponse{}, errors.New("comment body is required")
	}
	if targetType != "post" && targetType != "live" {
		return CommentResponse{}, errors.New("targetType must be post or live")
	}

	var id int64
	if err := s.Pool.QueryRow(ctx, `
		INSERT INTO comments (user_id, target_type, target_id, body)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, userID, targetType, targetID, body).Scan(&id); err != nil {
		return CommentResponse{}, err
	}

	comments, err := s.ListComments(ctx, targetType, targetID)
	if err != nil {
		return CommentResponse{}, err
	}
	for _, comment := range comments {
		if comment.ID == id {
			return comment, nil
		}
	}
	return CommentResponse{}, pgx.ErrNoRows
}

func (s *DataService) ListChatContacts(ctx context.Context, userID int64) ([]ChatContact, error) {
	if err := s.EnsureUserRecords(ctx, userID); err != nil {
		return nil, err
	}

	rows, err := s.Pool.Query(ctx, `
		WITH latest AS (
			SELECT DISTINCT ON (room_id)
				room_id,
				body,
				created_at
			FROM chat_room_messages
			ORDER BY room_id, created_at DESC, id DESC
		)
		SELECT
			r.id::text,
			r.type,
			CASE
				WHEN r.type = 'direct' THEN COALESCE(other_user.name, r.title, 'Direct chat')
				ELSE r.title
			END AS name,
			CASE
				WHEN r.type = 'direct' THEN COALESCE(NULLIF(other_profile.headline, ''), 'Direct chat')
				ELSE CONCAT(participant_counts.count, ' members')
			END AS subtitle,
			COALESCE(latest.body, ''),
			COALESCE(latest.created_at, r.updated_at),
			participant_counts.count
		FROM chat_rooms r
		JOIN chat_room_participants me ON me.room_id = r.id AND me.user_id = $1
		LEFT JOIN latest ON latest.room_id = r.id
		LEFT JOIN LATERAL (
			SELECT u.id, u.name, u.email
			FROM chat_room_participants p
			JOIN users u ON u.id = p.user_id
			WHERE p.room_id = r.id AND p.user_id <> $1
			ORDER BY u.name
			LIMIT 1
		) other_user ON true
		LEFT JOIN user_profiles other_profile ON other_profile.user_id = other_user.id
		JOIN LATERAL (
			SELECT COUNT(*)::int AS count
			FROM chat_room_participants p
			WHERE p.room_id = r.id
		) participant_counts ON true
		ORDER BY (latest.created_at IS NULL), COALESCE(latest.created_at, r.updated_at) DESC, name ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	contacts := make([]ChatContact, 0)
	for rows.Next() {
		var contact ChatContact
		var updatedAt time.Time
		if err := rows.Scan(&contact.ID, &contact.Type, &contact.Name, &contact.Subtitle, &contact.LastBody, &updatedAt, &contact.ParticipantCount); err != nil {
			return nil, err
		}
		contact.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		participants, err := s.ListChatParticipants(ctx, contact.ID)
		if err != nil {
			return nil, err
		}
		contact.Participants = participants
		contacts = append(contacts, contact)
	}
	return contacts, rows.Err()
}

func (s *DataService) ListChatParticipants(ctx context.Context, roomID string) ([]ChatParticipant, error) {
	roomNumber, err := parseRoomID(roomID)
	if err != nil {
		return nil, err
	}

	rows, err := s.Pool.Query(ctx, `
		SELECT u.id, u.name, u.email
		FROM chat_room_participants p
		JOIN users u ON u.id = p.user_id
		WHERE p.room_id = $1
		ORDER BY p.role = 'owner' DESC, u.name ASC
	`, roomNumber)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	participants := make([]ChatParticipant, 0)
	for rows.Next() {
		var participant ChatParticipant
		if err := rows.Scan(&participant.ID, &participant.Name, &participant.Email); err != nil {
			return nil, err
		}
		participants = append(participants, participant)
	}
	return participants, rows.Err()
}

func (s *DataService) ListChatMessages(ctx context.Context, userID int64, roomID string) ([]ChatMessage, error) {
	roomNumber, err := parseRoomID(roomID)
	if err != nil {
		return nil, err
	}
	if err := s.EnsureUserRecords(ctx, userID); err != nil {
		return nil, err
	}
	if err := s.ensureRoomMembership(ctx, roomNumber, userID); err != nil {
		return nil, err
	}

	rows, err := s.Pool.Query(ctx, `
		SELECT
			m.id,
			m.room_id::text,
			m.body,
			m.created_at,
			COALESCE(m.sender_user_id = $1, false) AS own,
			u.id,
			u.email,
			u.name,
			u.provider,
			u.password_hash,
			u.created_at
		FROM chat_room_messages m
		JOIN users u ON u.id = m.sender_user_id
		WHERE m.room_id = $2
		ORDER BY m.created_at ASC, m.id ASC
	`, userID, roomNumber)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]ChatMessage, 0)
	for rows.Next() {
		var message ChatMessage
		var createdAt time.Time
		var own bool
		var sender User
		if err := rows.Scan(
			&message.ID,
			&message.RoomID,
			&message.Body,
			&createdAt,
			&own,
			&sender.ID,
			&sender.Email,
			&sender.Name,
			&sender.Provider,
			&sender.PasswordHash,
			&sender.CreatedAt,
		); err != nil {
			return nil, err
		}
		message.ContactID = message.RoomID
		message.Sender = toAuthUser(sender)
		message.Own = own
		message.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		messages = append(messages, message)
	}
	return messages, rows.Err()
}

func (s *DataService) SendChatMessage(ctx context.Context, userID int64, roomID string, body string) (ChatMessage, error) {
	roomNumber, err := parseRoomID(roomID)
	if err != nil {
		return ChatMessage{}, err
	}
	body = strings.TrimSpace(body)
	if body == "" {
		return ChatMessage{}, errors.New("message body is required")
	}
	if err := s.ensureRoomMembership(ctx, roomNumber, userID); err != nil {
		return ChatMessage{}, err
	}

	var id int64
	if err := s.Pool.QueryRow(ctx, `
		INSERT INTO chat_room_messages (room_id, sender_user_id, body)
		VALUES ($1, $2, $3)
		RETURNING id
	`, roomNumber, userID, body).Scan(&id); err != nil {
		return ChatMessage{}, err
	}
	if _, err := s.Pool.Exec(ctx, `
		UPDATE chat_rooms
		SET updated_at = now()
		WHERE id = $1
	`, roomNumber); err != nil {
		return ChatMessage{}, err
	}

	messages, err := s.ListChatMessages(ctx, userID, roomID)
	if err != nil {
		return ChatMessage{}, err
	}
	for _, message := range messages {
		if message.ID == id {
			return message, nil
		}
	}
	return ChatMessage{}, pgx.ErrNoRows
}

func (s *DataService) ListChatUsers(ctx context.Context, currentUserID int64) ([]ChatUser, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT u.id, u.name, u.email, COALESCE(NULLIF(p.headline, ''), 'Creator') AS headline
		FROM users u
		LEFT JOIN user_profiles p ON p.user_id = u.id
		WHERE u.id <> $1
		ORDER BY
			CASE WHEN u.provider = 'seed' THEN 0 ELSE 1 END,
			u.name ASC
		LIMIT 30
	`, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]ChatUser, 0)
	for rows.Next() {
		var user ChatUser
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Headline); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *DataService) CreateChatRoom(ctx context.Context, userID int64, roomType string, title string, participantIDs []int64) (ChatContact, error) {
	roomType = strings.TrimSpace(roomType)
	title = strings.TrimSpace(title)
	participantIDs = uniqueIDs(participantIDs, userID)

	if roomType == "" {
		roomType = "direct"
	}
	if roomType != "direct" && roomType != "group" {
		return ChatContact{}, errors.New("chat room type must be direct or group")
	}
	if roomType == "direct" && len(participantIDs) != 2 {
		return ChatContact{}, errors.New("direct chats need exactly one other user")
	}
	if roomType == "group" && len(participantIDs) < 3 {
		return ChatContact{}, errors.New("group chats need at least two other users")
	}
	if roomType == "group" && title == "" {
		title = "New group"
	}

	var roomID int64
	if roomType == "direct" {
		otherID := participantIDs[0]
		if otherID == userID {
			otherID = participantIDs[1]
		}
		var err error
		roomID, err = s.ensureDirectRoomByID(ctx, userID, otherID, "")
		if err != nil {
			return ChatContact{}, err
		}
	} else {
		err := s.Pool.QueryRow(ctx, `
			INSERT INTO chat_rooms (type, title, created_by)
			VALUES ('group', $1, $2)
			RETURNING id
		`, title, userID).Scan(&roomID)
		if err != nil {
			return ChatContact{}, err
		}
		for _, participantID := range participantIDs {
			role := "member"
			if participantID == userID {
				role = "owner"
			}
			if _, err := s.Pool.Exec(ctx, `
				INSERT INTO chat_room_participants (room_id, user_id, role)
				VALUES ($1, $2, $3)
				ON CONFLICT (room_id, user_id) DO NOTHING
			`, roomID, participantID, role); err != nil {
				return ChatContact{}, err
			}
		}
	}

	rooms, err := s.ListChatContacts(ctx, userID)
	if err != nil {
		return ChatContact{}, err
	}
	roomKey := fmt.Sprint(roomID)
	for _, room := range rooms {
		if room.ID == roomKey {
			return room, nil
		}
	}
	return ChatContact{}, pgx.ErrNoRows
}

func (s *DataService) AddUsersToRoom(ctx context.Context, userID int64, roomID string, participantIDs []int64) (ChatContact, error) {
	roomNumber, err := parseRoomID(roomID)
	if err != nil {
		return ChatContact{}, err
	}
	if err := s.ensureRoomMembership(ctx, roomNumber, userID); err != nil {
		return ChatContact{}, err
	}
	var roomType string
	if err := s.Pool.QueryRow(ctx, `SELECT type FROM chat_rooms WHERE id = $1`, roomNumber).Scan(&roomType); err != nil {
		return ChatContact{}, err
	}
	if roomType != "group" {
		return ChatContact{}, errors.New("users can only be added to group chats")
	}

	for _, participantID := range uniqueIDs(participantIDs) {
		if participantID == userID {
			continue
		}
		if _, err := s.Pool.Exec(ctx, `
			INSERT INTO chat_room_participants (room_id, user_id, role)
			VALUES ($1, $2, 'member')
			ON CONFLICT (room_id, user_id) DO NOTHING
		`, roomNumber, participantID); err != nil {
			return ChatContact{}, err
		}
	}
	if _, err := s.Pool.Exec(ctx, `UPDATE chat_rooms SET updated_at = now() WHERE id = $1`, roomNumber); err != nil {
		return ChatContact{}, err
	}

	rooms, err := s.ListChatContacts(ctx, userID)
	if err != nil {
		return ChatContact{}, err
	}
	for _, room := range rooms {
		if room.ID == roomID {
			return room, nil
		}
	}
	return ChatContact{}, pgx.ErrNoRows
}

func (s *DataService) ensureDirectRoom(ctx context.Context, userID int64, otherID int64, legacyContactID string) (int64, error) {
	return s.ensureDirectRoomByID(ctx, userID, otherID, legacyContactID)
}

func (s *DataService) ensureDirectRoomByID(ctx context.Context, userID int64, otherID int64, legacyContactID string) (int64, error) {
	if userID == otherID {
		return 0, errors.New("direct chat requires another user")
	}

	key := directKey(userID, otherID)
	var roomID int64
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO chat_rooms (type, title, created_by, direct_key, legacy_contact_id)
		VALUES ('direct', '', $1, $2, NULLIF($3, ''))
		ON CONFLICT (direct_key) DO UPDATE
		SET legacy_contact_id = COALESCE(chat_rooms.legacy_contact_id, EXCLUDED.legacy_contact_id),
			updated_at = chat_rooms.updated_at
		RETURNING id
	`, userID, key, legacyContactID).Scan(&roomID)
	if err != nil {
		return 0, err
	}

	for _, participantID := range []int64{userID, otherID} {
		role := "member"
		if participantID == userID {
			role = "owner"
		}
		if _, err := s.Pool.Exec(ctx, `
			INSERT INTO chat_room_participants (room_id, user_id, role)
			VALUES ($1, $2, $3)
			ON CONFLICT (room_id, user_id) DO NOTHING
		`, roomID, participantID, role); err != nil {
			return 0, err
		}
	}
	return roomID, nil
}

func (s *DataService) ensureGroupRoom(ctx context.Context, userID int64, title string, participantEmails []string) (int64, error) {
	var roomID int64
	err := s.Pool.QueryRow(ctx, `
		SELECT r.id
		FROM chat_rooms r
		JOIN chat_room_participants p ON p.room_id = r.id AND p.user_id = $2
		WHERE r.type = 'group' AND r.title = $1
		LIMIT 1
	`, title, userID).Scan(&roomID)
	if err == nil {
		return roomID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	if err := s.Pool.QueryRow(ctx, `
		INSERT INTO chat_rooms (type, title, created_by)
		VALUES ('group', $1, $2)
		RETURNING id
	`, title, userID).Scan(&roomID); err != nil {
		return 0, err
	}
	if _, err := s.Pool.Exec(ctx, `
		INSERT INTO chat_room_participants (room_id, user_id, role)
		VALUES ($1, $2, 'owner')
		ON CONFLICT (room_id, user_id) DO NOTHING
	`, roomID, userID); err != nil {
		return 0, err
	}
	for _, email := range participantEmails {
		user, err := s.FindUserByEmail(ctx, email)
		if err != nil {
			return 0, err
		}
		if _, err := s.Pool.Exec(ctx, `
			INSERT INTO chat_room_participants (room_id, user_id, role)
			VALUES ($1, $2, 'member')
			ON CONFLICT (room_id, user_id) DO NOTHING
		`, roomID, user.ID); err != nil {
			return 0, err
		}
	}
	return roomID, nil
}

func (s *DataService) ensureRoomMembership(ctx context.Context, roomID int64, userID int64) error {
	var exists bool
	if err := s.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM chat_room_participants
			WHERE room_id = $1 AND user_id = $2
		)
	`, roomID, userID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return errors.New("chat room not found")
	}
	return nil
}

func parseRoomID(value string) (int64, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, errors.New("roomId is required")
	}
	var parsed int64
	if _, err := fmt.Sscan(value, &parsed); err != nil || parsed <= 0 {
		return 0, errors.New("roomId is invalid")
	}
	return parsed, nil
}

func directKey(left int64, right int64) string {
	if left > right {
		left, right = right, left
	}
	return fmt.Sprintf("%d:%d", left, right)
}

func uniqueIDs(values []int64, required ...int64) []int64 {
	seen := map[int64]struct{}{}
	result := make([]int64, 0, len(values)+len(required))
	for _, value := range append(values, required...) {
		if value <= 0 {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".") && !strings.ContainsAny(email, " \t\r\n")
}

func publicError(err error) string {
	if errors.Is(err, pgx.ErrNoRows) {
		return "not found"
	}
	if err == nil {
		return ""
	}
	return fmt.Sprintf("%v", err)
}
