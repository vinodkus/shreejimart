-- Run in Neon SQL Editor if categories table already exists

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL;
