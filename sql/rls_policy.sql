-- sql/rls_policy.sql
-- Row-Level Security (RLS) policies for Wunpini
--
-- NOTE: This file only adds the RLS policies into the repository. Run the contents in your
-- Supabase SQL editor (or via psql/supabase CLI) to apply them to the database.

-- Enable RLS on relevant tables
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow anonymous SELECT on menu_items where visible
CREATE POLICY public_select_menu_items
  ON public.menu_items
  FOR SELECT
  USING (available IS TRUE);

-- Allow constrained anonymous INSERTs into orders
CREATE POLICY public_insert_orders
  ON public.orders
  FOR INSERT
  USING ( true )
  WITH CHECK (
    total > 0
    AND phone IS NOT NULL
    AND char_length(phone) > 4
    AND (customer_name IS NOT NULL AND char_length(customer_name) > 1)
  );

-- Allow constrained anonymous INSERTs into order_items
CREATE POLICY public_insert_order_items
  ON public.order_items
  FOR INSERT
  USING ( true )
  WITH CHECK (
    quantity > 0
    AND unit_price >= 0
  );
