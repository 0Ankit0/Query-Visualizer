-- Query Visualizer PostgreSQL seed data
-- Usage:
--   psql "$QUERY_VISUALIZER_POSTGRES_DSN" -f backend/seed/postgres_seed.sql

BEGIN;

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  last_login TIMESTAMPTZ
);

INSERT INTO customers (name, tier, created_at) VALUES
  ('Acme Retail', 'gold', '2026-01-01T00:00:00Z'),
  ('Northwind Foods', 'silver', '2026-01-10T00:00:00Z'),
  ('Blue River Labs', 'gold', '2026-02-15T00:00:00Z'),
  ('Elm Street Market', 'bronze', '2026-02-20T00:00:00Z'),
  ('Sunset Ventures', 'silver', '2026-03-01T00:00:00Z');

INSERT INTO orders (customer_id, amount, status, created_at) VALUES
  (1, 210.00, 'paid', '2026-03-01T10:00:00Z'),
  (1, 155.00, 'paid', '2026-03-02T10:00:00Z'),
  (1, 78.00, 'paid', '2026-03-03T10:00:00Z'),
  (1, 99.00, 'paid', '2026-03-04T10:00:00Z'),
  (1, 400.00, 'paid', '2026-03-05T10:00:00Z'),
  (1, 510.00, 'paid', '2026-03-06T10:00:00Z'),
  (1, 90.00, 'paid', '2026-03-07T10:00:00Z'),
  (2, 32.00, 'paid', '2026-03-01T11:00:00Z'),
  (2, 45.00, 'paid', '2026-03-08T11:00:00Z'),
  (3, 75.00, 'paid', '2026-03-01T12:00:00Z'),
  (3, 86.00, 'paid', '2026-03-03T12:00:00Z'),
  (3, 95.00, 'paid', '2026-03-05T12:00:00Z'),
  (3, 100.00, 'paid', '2026-03-07T12:00:00Z'),
  (4, 22.00, 'paid', '2026-03-02T09:00:00Z'),
  (5, 1000.00, 'paid', '2026-03-09T13:00:00Z');

INSERT INTO users (name, role, email, last_login) VALUES
  ('Ava Admin', 'admin', 'ava.admin@example.com', '2026-04-01T07:00:00Z'),
  ('Dev Analyst', 'analyst', 'dev.analyst@example.com', '2026-04-02T08:00:00Z'),
  ('Quinn QA', 'qa', 'quinn.qa@example.com', NULL);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_users_role ON users(role);

COMMIT;
