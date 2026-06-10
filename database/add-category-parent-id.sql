-- Run in Neon SQL Editor if categories table already exists (no parent_id yet)

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS parent_id UUID NULL REFERENCES categories(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
