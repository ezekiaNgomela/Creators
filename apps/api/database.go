package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func initDB(ctx context.Context, connStr string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	if _, err := pool.Exec(ctx, schemaSQL); err != nil {
		pool.Close()
		return nil, err
	}

	if err := seedDatabase(ctx, pool); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}

const schemaSQL = `
CREATE TABLE IF NOT EXISTS users (
	id BIGSERIAL PRIMARY KEY,
	email TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL,
	password_hash TEXT,
	provider TEXT NOT NULL DEFAULT 'email',
	google_sub TEXT UNIQUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
	user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	bio TEXT NOT NULL DEFAULT '',
	headline TEXT NOT NULL DEFAULT '',
	location TEXT NOT NULL DEFAULT '',
	avatar_url TEXT NOT NULL DEFAULT '',
	cover_url TEXT NOT NULL DEFAULT '',
	website_url TEXT NOT NULL DEFAULT '',
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
	id BIGSERIAL PRIMARY KEY,
	author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body TEXT NOT NULL,
	mood TEXT NOT NULL DEFAULT 'Update',
	media_url TEXT NOT NULL DEFAULT '',
	media_type TEXT NOT NULL DEFAULT 'image',
	filter_name TEXT NOT NULL DEFAULT 'Original',
	overlay_text TEXT NOT NULL DEFAULT '',
	sticker TEXT NOT NULL DEFAULT '',
	text_color TEXT NOT NULL DEFAULT '#ffffff',
	background_tone TEXT NOT NULL DEFAULT 'midnight',
	aspect_ratio TEXT NOT NULL DEFAULT '4:5',
	crop_zoom DOUBLE PRECISION NOT NULL DEFAULT 1,
	crop_x INTEGER NOT NULL DEFAULT 50,
	crop_y INTEGER NOT NULL DEFAULT 50,
	rotation INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_rooms (
	id BIGSERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	host TEXT NOT NULL,
	topic TEXT NOT NULL,
	cover_url TEXT NOT NULL DEFAULT '',
	viewers INTEGER NOT NULL DEFAULT 0,
	starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	status TEXT NOT NULL DEFAULT 'live',
	accent TEXT NOT NULL DEFAULT 'ember',
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

CREATE TABLE IF NOT EXISTS notifications (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	body TEXT NOT NULL DEFAULT '',
	type TEXT NOT NULL DEFAULT 'system',
	link TEXT NOT NULL DEFAULT '',
	read_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_sessions (
	id BIGSERIAL PRIMARY KEY,
	room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
	created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	mode TEXT NOT NULL CHECK (mode IN ('voice', 'video')),
	status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS call_participants (
	call_id BIGINT NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'joined', 'left', 'declined')),
	joined_at TIMESTAMPTZ,
	left_at TIMESTAMPTZ,
	PRIMARY KEY (call_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
	id BIGSERIAL PRIMARY KEY,
	type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
	title TEXT NOT NULL DEFAULT '',
	created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
	direct_key TEXT UNIQUE,
	legacy_contact_id TEXT UNIQUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_room_participants (
	room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role TEXT NOT NULL DEFAULT 'member',
	joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_room_messages (
	id BIGSERIAL PRIMARY KEY,
	room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
	sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_room_reactions (
	id BIGSERIAL PRIMARY KEY,
	message_id BIGINT NOT NULL REFERENCES chat_room_messages(id) ON DELETE CASCADE,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	emoji TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS filter_name TEXT NOT NULL DEFAULT 'Original';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS overlay_text TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sticker TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS text_color TEXT NOT NULL DEFAULT '#ffffff';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS background_tone TEXT NOT NULL DEFAULT 'midnight';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS aspect_ratio TEXT NOT NULL DEFAULT '4:5';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS crop_zoom DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS crop_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS crop_y INTEGER NOT NULL DEFAULT 50;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS rotation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS cover_url TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cover_url TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website_url TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_participants_user ON call_participants(user_id, call_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_participants_user ON chat_room_participants(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_room ON chat_room_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_room_reactions(message_id);
`

func seedDatabase(ctx context.Context, pool *pgxpool.Pool) error {
	seedUsers := []struct {
		Email    string
		Name     string
		Headline string
		Bio      string
		Location string
	}{
		{
			Email:    "christina@creators.local",
			Name:     "Christina Kennedy",
			Headline: "Travel creator and launch strategist",
			Bio:      "Building polished travel stories, member-first launches, and repeatable creator systems.",
			Location: "Salt Lake City",
		},
		{
			Email:    "gerald@creators.local",
			Name:     "Gerald Thomas",
			Headline: "Studio operator for independent makers",
			Bio:      "Sharing practical systems for content teams, weekly launches, and stronger paid communities.",
			Location: "Austin",
		},
		{
			Email:    "noor@creators.local",
			Name:     "Noor Creates",
			Headline: "Short-form editor and community host",
			Bio:      "Turning production days into reusable edits, live rooms, and creator playbooks.",
			Location: "London",
		},
		{
			Email:    "alejandro@creators.local",
			Name:     "Alejandro Hicks",
			Headline: "Launch planning and creator operations",
			Bio:      "Helping creators turn scattered launch work into calm repeatable rooms.",
			Location: "Mexico City",
		},
		{
			Email:    "mika@creators.local",
			Name:     "Mika Studio",
			Headline: "Commerce room host",
			Bio:      "Building practical product-drop rooms for creators with real audience momentum.",
			Location: "New York",
		},
		{
			Email:    "maker-table@creators.local",
			Name:     "The Maker Table",
			Headline: "Community desk",
			Bio:      "A shared workspace for Q&A rooms, maker reviews, and member-first planning.",
			Location: "Remote",
		},
		{
			Email:    "louise@creators.local",
			Name:     "Louise Thornton",
			Headline: "Portfolio critique lead",
			Bio:      "Design reviews, portfolio edits, and steady release feedback for creators.",
			Location: "Berlin",
		},
	}

	for _, user := range seedUsers {
		var id int64
		if err := pool.QueryRow(ctx, `
			INSERT INTO users (email, name, provider)
			VALUES ($1, $2, 'seed')
			ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
			RETURNING id
		`, user.Email, user.Name).Scan(&id); err != nil {
			return fmt.Errorf("seed user %s: %w", user.Email, err)
		}

		if _, err := pool.Exec(ctx, `
			INSERT INTO user_profiles (user_id, bio, headline, location)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_id) DO UPDATE
			SET bio = EXCLUDED.bio,
				headline = EXCLUDED.headline,
				location = EXCLUDED.location,
				updated_at = now()
		`, id, user.Bio, user.Headline, user.Location); err != nil {
			return fmt.Errorf("seed profile %s: %w", user.Email, err)
		}
	}

	posts := []struct {
		Email          string
		Body           string
		Mood           string
		MediaURL       string
		MediaType      string
		FilterName     string
		OverlayText    string
		Sticker        string
		TextColor      string
		BackgroundTone string
		AspectRatio    string
		CropZoom       float64
		CropX          int
		CropY          int
		Rotation       int
		Age            string
	}{
		{
			Email:          "christina@creators.local",
			Body:           "Bryce Canyon turned into this week's member essay: one shoot, a print drop, and a behind-the-scenes editing room.",
			Mood:           "Travel",
			MediaURL:       "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=84",
			MediaType:      "image",
			FilterName:     "Warm",
			OverlayText:    "Desert edit room",
			Sticker:        "DROP",
			TextColor:      "#fff5da",
			BackgroundTone: "sunset",
			AspectRatio:    "4:5",
			CropZoom:       1,
			CropX:          50,
			CropY:          50,
			Rotation:       0,
			Age:            "2 hours",
		},
		{
			Email:          "gerald@creators.local",
			Body:           "The paid launch board is finally boring in the best way: offer, proof, audience note, publish, follow up.",
			Mood:           "Creators",
			MediaURL:       "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=84",
			MediaType:      "image",
			FilterName:     "Glow",
			OverlayText:    "Launch flow",
			Sticker:        "LIVE",
			TextColor:      "#d8fff1",
			BackgroundTone: "emerald",
			AspectRatio:    "1:1",
			CropZoom:       1.04,
			CropX:          46,
			CropY:          50,
			Rotation:       0,
			Age:            "3 hours",
		},
		{
			Email:          "noor@creators.local",
			Body:           "Batching short-form edits from one live room gave us nine clips and a cleaner path back to the full replay.",
			Mood:           "Video",
			MediaURL:       "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=84",
			MediaType:      "image",
			FilterName:     "Mono",
			OverlayText:    "9 clips from one room",
			Sticker:        "CUT",
			TextColor:      "#ffffff",
			BackgroundTone: "midnight",
			AspectRatio:    "9:16",
			CropZoom:       1.08,
			CropX:          52,
			CropY:          48,
			Rotation:       0,
			Age:            "5 hours",
		},
	}
	for _, post := range posts {
		if _, err := pool.Exec(ctx, `
			INSERT INTO posts (
				author_id, body, mood, media_url, media_type, filter_name, overlay_text,
				sticker, text_color, background_tone, aspect_ratio, crop_zoom,
				crop_x, crop_y, rotation, created_at
			)
			SELECT id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now() - $16::interval
			FROM users
			WHERE email = $1
			AND NOT EXISTS (SELECT 1 FROM posts WHERE body = $2)
		`, post.Email, post.Body, post.Mood, post.MediaURL, post.MediaType, post.FilterName, post.OverlayText, post.Sticker, post.TextColor, post.BackgroundTone, post.AspectRatio, post.CropZoom, post.CropX, post.CropY, post.Rotation, post.Age); err != nil {
			return fmt.Errorf("seed post %s: %w", post.Email, err)
		}
		if _, err := pool.Exec(ctx, `
			UPDATE posts
			SET media_url = CASE WHEN media_url = '' THEN $3 ELSE media_url END,
				media_type = CASE WHEN media_type = 'image' THEN $4 ELSE media_type END,
				filter_name = CASE WHEN filter_name = 'Original' THEN $5 ELSE filter_name END,
				overlay_text = CASE WHEN overlay_text = '' THEN $6 ELSE overlay_text END,
				sticker = CASE WHEN sticker = '' THEN $7 ELSE sticker END,
				text_color = CASE WHEN text_color = '#ffffff' THEN $8 ELSE text_color END,
				background_tone = CASE WHEN background_tone = 'midnight' THEN $9 ELSE background_tone END,
				aspect_ratio = CASE WHEN aspect_ratio = '4:5' THEN $10 ELSE aspect_ratio END,
				crop_zoom = CASE WHEN crop_zoom = 1 THEN $11 ELSE crop_zoom END,
				crop_x = CASE WHEN crop_x = 50 THEN $12 ELSE crop_x END,
				crop_y = CASE WHEN crop_y = 50 THEN $13 ELSE crop_y END,
				rotation = CASE WHEN rotation = 0 THEN $14 ELSE rotation END
			WHERE body = $2
			AND author_id = (SELECT id FROM users WHERE email = $1)
		`, post.Email, post.Body, post.MediaURL, post.MediaType, post.FilterName, post.OverlayText, post.Sticker, post.TextColor, post.BackgroundTone, post.AspectRatio, post.CropZoom, post.CropX, post.CropY, post.Rotation); err != nil {
			return fmt.Errorf("seed post %s: %w", post.Email, err)
		}
	}

	rooms := []struct {
		Title    string
		Host     string
		Topic    string
		CoverURL string
		Viewers  int
		Starts   string
		Status   string
		Accent   string
	}{
		{"Launch teardown: first paid drop", "Mika Studio", "Commerce", "https://images.unsplash.com/photo-1551817958-20204d6ab0b6?auto=format&fit=crop&w=1400&q=84", 248, "11 minutes", "live", "ember"},
		{"Editing room: short-form batch", "Noor Creates", "Video", "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1400&q=84", 96, "27 minutes", "live", "moss"},
		{"Member Q&A before release", "The Maker Table", "Community", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=84", 64, "18 minutes", "scheduled", "ink"},
		{"Archived critique: portfolio edits", "Louise Thornton", "Design", "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=84", 0, "3 days", "previous", "rose"},
		{"Tomorrow creator planning", "Alejandro Hicks", "Planning", "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=84", 0, "1 day", "scheduled", "moss"},
	}
	for _, room := range rooms {
		operator := "-"
		if room.Status == "scheduled" {
			operator = "+"
		}
		if _, err := pool.Exec(ctx, fmt.Sprintf(`
			INSERT INTO live_rooms (title, host, topic, cover_url, viewers, starts_at, status, accent)
			SELECT $1, $2, $3, $4, $5, now() %s $6::interval, $7, $8
			WHERE NOT EXISTS (SELECT 1 FROM live_rooms WHERE title = $1)
		`, operator), room.Title, room.Host, room.Topic, room.CoverURL, room.Viewers, room.Starts, room.Status, room.Accent); err != nil {
			return fmt.Errorf("seed live room %s: %w", room.Title, err)
		}
		if _, err := pool.Exec(ctx, `
			UPDATE live_rooms
			SET cover_url = CASE WHEN cover_url = '' THEN $2 ELSE cover_url END
			WHERE title = $1
		`, room.Title, room.CoverURL); err != nil {
			return fmt.Errorf("seed live room cover %s: %w", room.Title, err)
		}
	}

	return nil
}
