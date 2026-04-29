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
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
	id BIGSERIAL PRIMARY KEY,
	author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body TEXT NOT NULL,
	mood TEXT NOT NULL DEFAULT 'Update',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_rooms (
	id BIGSERIAL PRIMARY KEY,
	title TEXT NOT NULL,
	host TEXT NOT NULL,
	topic TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS chat_contacts (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	subtitle TEXT NOT NULL DEFAULT '',
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	contact_id TEXT NOT NULL,
	body TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	sender_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
	sender_name TEXT
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

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_contact ON chat_messages(user_id, contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_room_participants_user ON chat_room_participants(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_room ON chat_room_messages(room_id, created_at);
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
		Email string
		Body  string
		Mood  string
		Age   string
	}{
		{
			Email: "christina@creators.local",
			Body:  "Bryce Canyon turned into this week's member essay: one shoot, a print drop, and a behind-the-scenes editing room.",
			Mood:  "Travel",
			Age:   "2 hours",
		},
		{
			Email: "gerald@creators.local",
			Body:  "The paid launch board is finally boring in the best way: offer, proof, audience note, publish, follow up.",
			Mood:  "Creators",
			Age:   "3 hours",
		},
		{
			Email: "noor@creators.local",
			Body:  "Batching short-form edits from one live room gave us nine clips and a cleaner path back to the full replay.",
			Mood:  "Video",
			Age:   "5 hours",
		},
	}
	for _, post := range posts {
		if _, err := pool.Exec(ctx, `
			INSERT INTO posts (author_id, body, mood, created_at)
			SELECT id, $2, $3, now() - $4::interval
			FROM users
			WHERE email = $1
			AND NOT EXISTS (SELECT 1 FROM posts WHERE body = $2)
		`, post.Email, post.Body, post.Mood, post.Age); err != nil {
			return fmt.Errorf("seed post %s: %w", post.Email, err)
		}
	}

	rooms := []struct {
		Title   string
		Host    string
		Topic   string
		Viewers int
		Starts  string
		Status  string
		Accent  string
	}{
		{"Launch teardown: first paid drop", "Mika Studio", "Commerce", 248, "11 minutes", "live", "ember"},
		{"Editing room: short-form batch", "Noor Creates", "Video", 96, "27 minutes", "live", "moss"},
		{"Member Q&A before release", "The Maker Table", "Community", 64, "18 minutes", "scheduled", "ink"},
		{"Archived critique: portfolio edits", "Louise Thornton", "Design", 0, "3 days", "previous", "rose"},
		{"Tomorrow creator planning", "Alejandro Hicks", "Planning", 0, "1 day", "scheduled", "moss"},
	}
	for _, room := range rooms {
		operator := "-"
		if room.Status == "scheduled" {
			operator = "+"
		}
		if _, err := pool.Exec(ctx, fmt.Sprintf(`
			INSERT INTO live_rooms (title, host, topic, viewers, starts_at, status, accent)
			SELECT $1, $2, $3, $4, now() %s $5::interval, $6, $7
			WHERE NOT EXISTS (SELECT 1 FROM live_rooms WHERE title = $1)
		`, operator), room.Title, room.Host, room.Topic, room.Viewers, room.Starts, room.Status, room.Accent); err != nil {
			return fmt.Errorf("seed live room %s: %w", room.Title, err)
		}
	}

	contacts := []struct {
		ID       string
		Name     string
		Subtitle string
	}{
		{"alejandro-hicks", "Alejandro Hicks", "Launch planning and creator operations"},
		{"mika-studio", "Mika Studio", "Commerce room host"},
		{"noor-creates", "Noor Creates", "Video editor and live co-host"},
		{"maker-table", "The Maker Table", "Community desk"},
	}
	for _, contact := range contacts {
		if _, err := pool.Exec(ctx, `
			INSERT INTO chat_contacts (id, name, subtitle)
			VALUES ($1, $2, $3)
			ON CONFLICT (id) DO UPDATE
			SET name = EXCLUDED.name,
				subtitle = EXCLUDED.subtitle
		`, contact.ID, contact.Name, contact.Subtitle); err != nil {
			return fmt.Errorf("seed contact %s: %w", contact.ID, err)
		}
	}

	return nil
}
