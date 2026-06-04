-- Run in pgAdmin on database ShreejiMart (or your POSTGRES_DB name)

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS ix_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS ix_order_lines_order_id ON order_lines (order_id);
