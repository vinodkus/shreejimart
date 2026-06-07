-- Run once on existing database (Neon / pgAdmin)

ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 0;
