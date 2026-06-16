-- Run in Neon SQL Editor if products table already exists

ALTER TABLE products
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(16) NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2) NULL;

-- Legacy column from earlier discount work (safe if never added)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS discount_price NUMERIC(12, 2) NULL;

-- Migrate old sale-price column to rupees discount type
UPDATE products
SET discount_type = 'rupees',
    discount_value = discount_price
WHERE discount_price IS NOT NULL
  AND discount_price > 0
  AND discount_price < price
  AND (discount_type IS NULL OR discount_value IS NULL);
