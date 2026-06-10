-- Run in Neon SQL Editor if database already exists

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    auth_provider VARCHAR(20) NOT NULL,
    google_sub VARCHAR(128),
    email VARCHAR(200),
    display_name VARCHAR(120),
    phone VARCHAR(15),
    default_address VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_google_sub ON customers(google_sub) WHERE google_sub IS NOT NULL;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
