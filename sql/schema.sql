-- SQL schema for Wunpini Kitchen (Postgres / Supabase)
-- Run this in your Supabase SQL editor or psql to create the database schema.
-- NOTE: Replace password placeholders and manage secrets outside of this file.

-- Create an administrator role (optional at DB level). Supabase manages auth separately,
-- but this role can be used for managed connections or for clarity.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'administrator') THEN
    CREATE ROLE administrator NOINHERIT;
  END IF;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS admins (
  id bigserial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id bigserial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS menu_items (
  id bigserial PRIMARY KEY,
  category_id bigint REFERENCES menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id bigserial PRIMARY KEY,
  customer_name text,
  phone text,
  address text,
  total numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending', -- pending, preparing, delivering, completed, cancelled
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id bigint REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id bigint REFERENCES menu_items(id),
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimonials (
  id bigserial PRIMARY KEY,
  quote text NOT NULL,
  author text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

-- Grants for administrator role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO administrator;

-- Example seeds (replace password_hash with a bcrypt hash before deploying)
-- To generate a bcrypt hash you can run: node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"

INSERT INTO menu_categories (slug, title) VALUES
('banku','Banku & Okro Soup'),
('tz','T.Z. With Soup'),
('kokonte','Kokonte With Soup'),
('fufulight','Fufu With Light Soup'),
('fufugroundnut','Fufu With Groundnut Soup'),
('kelewele','Kelewele')
ON CONFLICT (slug) DO NOTHING;

-- Sample admin insert (development)
-- Replace the password_hash below with a real bcrypt hash before production.
INSERT INTO admins (email, password_hash, full_name)
VALUES ('admin@example.com', 'bcrypt_placeholder_hash', 'Site Administrator')
ON CONFLICT (email) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Row-Level Security and policies
-- Supabase recommends enabling RLS and creating policies per table.
-- Example: Allow only authenticated admins (via Supabase auth) to manage menu_items.
-- You should create policies in the Supabase UI matching your auth model.

-- End of schema
