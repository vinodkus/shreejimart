-- Run in Neon SQL Editor if categories table already exists

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categories_parent_display_order
ON categories (parent_id, display_order);

-- Backfill: preserve current alphabetical order within each sibling group
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY parent_id
            ORDER BY name
        ) - 1 AS new_order
    FROM categories
)
UPDATE categories c
SET display_order = ranked.new_order
FROM ranked
WHERE c.id = ranked.id;
