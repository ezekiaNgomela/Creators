package main

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ensureSchemaPrerequisites(ctx context.Context, connStr string) error {
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS users (
	id BIGSERIAL PRIMARY KEY,
	email TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL,
	password_hash TEXT,
	provider TEXT NOT NULL DEFAULT 'email',
	google_sub TEXT UNIQUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
`)
	return err
}
