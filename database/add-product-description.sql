-- Run in Neon SQL Editor if products table already exists

ALTER TABLE products
ADD COLUMN IF NOT EXISTS description VARCHAR(2000) NULL;
