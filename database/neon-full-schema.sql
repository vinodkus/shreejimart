-- Run in Neon SQL Editor (database: neondb)
-- Creates all tables for ShreeJiMart

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    parent_id UUID NULL REFERENCES categories(id) ON DELETE RESTRICT,
    image_url VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(160) NOT NULL,
    description VARCHAR(2000),
    price NUMERIC(12, 2) NOT NULL,
    discount_type VARCHAR(16) NULL,
    discount_value NUMERIC(12, 2) NULL,
    unit VARCHAR(32) NOT NULL,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    stock_quantity INT NOT NULL DEFAULT 0
);

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

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    customer_id UUID NULL REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(120),
    phone VARCHAR(15) NOT NULL,
    delivery_address VARCHAR(500) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'COD',
    status VARCHAR(32) NOT NULL DEFAULT 'Pending',
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_lines (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name VARCHAR(160) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS ix_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS ix_order_lines_order_id ON order_lines (order_id);
