package repository

import (
	"context"
	_ "embed"
)

//go:embed migrations/000001_init.sql
var initMigration string

func (r *Repository) ApplyMigrations(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, initMigration)
	return err
}
