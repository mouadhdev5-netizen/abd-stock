-- ============================================================
-- ABD STOCK - MASTER FIX SCRIPT
-- Run this in your Supabase SQL Editor.
-- It safely adds all missing pieces WITHOUT destroying your data.
-- ============================================================

-- ── 1. FIX: product_variants missing 'status' column ─────────
-- The DB has 'is_active BOOLEAN' but old code tried to write 'status TEXT'
-- We keep is_active as the source of truth (no change needed to DB here,
-- the code has been fixed to use is_active).

-- ── 2. FIX: product_status enum - add 'discontinued' for delete ──
-- (discontinued already exists from migration 001, confirmed)

-- ── 3. FIX: user_role ENUM - add new v2 roles ─────────────────
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'commerce_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'production_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'warehouse_agent';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branch_manager';

-- ── 4. FIX: Storage bucket for images ─────────────────────────
-- Creates the 'assets' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old storage policies (safe to re-run)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

-- Recreate storage policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'assets' AND auth.role() = 'authenticated');

-- ── 5. FIX: Add v2 columns and tables (all IF NOT EXISTS) ─────

-- customers table additions
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS debt_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2) DEFAULT 0;

-- ── 6. Commands table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_transit','delivered','cancelled')),
  yalidin_tracking_id TEXT,
  delivery_address TEXT,
  wilaya TEXT,
  commune TEXT,
  notes TEXT,
  total NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cod',
  so_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Command items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS command_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES commands(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  product_name TEXT
);

-- ── 8. Components (production materials) ──────────────────────
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_price NUMERIC(12,4) DEFAULT 0,
  quantity_in_stock NUMERIC(12,3) DEFAULT 0,
  reorder_level NUMERIC(12,3) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. Recipes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  component_id UUID REFERENCES components(id) ON DELETE SET NULL,
  quantity_used NUMERIC(12,3) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recipe_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity_produced INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recipe_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  executed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  total_cost NUMERIC(12,2) DEFAULT 0,
  notes TEXT
);

-- ── 10. Product Charges (Commerce) ────────────────────────────
CREATE TABLE IF NOT EXISTS product_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  last_generated_at DATE,
  parent_charge_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for parent_charge_id after table exists
ALTER TABLE product_charges 
  DROP CONSTRAINT IF EXISTS product_charges_parent_charge_id_fkey;
ALTER TABLE product_charges 
  ADD CONSTRAINT product_charges_parent_charge_id_fkey 
  FOREIGN KEY (parent_charge_id) REFERENCES product_charges(id) ON DELETE CASCADE;

-- ── 11. Customer Debt Payments ─────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. WhatsApp ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  phone_number TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  recipients_count INTEGER DEFAULT 0,
  message_body TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. Suppliers v2 (make sure is_active exists) ─────────────
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ── 14. Sales Orders v2 additions ─────────────────────────────
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS so_number TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tax_total NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount_total NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;

-- ── 15. Purchase Orders v2 additions ──────────────────────────
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;

-- ── 16. v_product_stock view (recreate with all fixes) ─────────
DROP VIEW IF EXISTS v_product_stock CASCADE;
CREATE OR REPLACE VIEW v_product_stock AS
SELECT
  p.id AS product_id,
  p.company_id,
  p.name,
  p.name_ar,
  p.name_fr,
  p.sku,
  p.barcode,
  p.cost_price,
  p.sell_price,
  p.reorder_level,
  p.status,
  p.has_variants,
  p.thumbnail_url,
  COALESCE(SUM(inv.quantity_on_hand), 0) AS total_qty_on_hand,
  COALESCE(SUM(inv.quantity_on_hand), 0) AS total_qty_available
FROM products p
LEFT JOIN inventory inv ON inv.product_id = p.id
WHERE p.status != 'discontinued'
GROUP BY p.id;

-- ── 17. Recurring charges RPC function ─────────────────────────
CREATE OR REPLACE FUNCTION generate_recurring_charges(p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_next_date DATE;
BEGIN
    FOR r IN
        SELECT * FROM product_charges
        WHERE company_id = p_company_id AND is_recurring = TRUE AND last_generated_at IS NOT NULL
    LOOP
        IF r.recurring_interval = 'daily' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 day';
        ELSIF r.recurring_interval = 'weekly' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 week';
        ELSIF r.recurring_interval = 'monthly' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 month';
        ELSIF r.recurring_interval = 'yearly' THEN
            v_next_date := r.last_generated_at + INTERVAL '1 year';
        ELSE
            CONTINUE;
        END IF;

        WHILE v_next_date <= CURRENT_DATE LOOP
            INSERT INTO product_charges (
                company_id, product_id, description, amount, charge_date,
                notes, created_by, is_recurring, recurring_interval, parent_charge_id
            ) VALUES (
                r.company_id, r.product_id, r.description, r.amount, v_next_date,
                r.notes, r.created_by, FALSE, NULL, r.id
            );
            UPDATE product_charges SET last_generated_at = v_next_date WHERE id = r.id;

            IF r.recurring_interval = 'daily' THEN
                v_next_date := v_next_date + INTERVAL '1 day';
            ELSIF r.recurring_interval = 'weekly' THEN
                v_next_date := v_next_date + INTERVAL '1 week';
            ELSIF r.recurring_interval = 'monthly' THEN
                v_next_date := v_next_date + INTERVAL '1 month';
            ELSIF r.recurring_interval = 'yearly' THEN
                v_next_date := v_next_date + INTERVAL '1 year';
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ── 18. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_commands_company ON commands(company_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
CREATE INDEX IF NOT EXISTS idx_components_company ON components(company_id);
CREATE INDEX IF NOT EXISTS idx_recipes_company ON recipes(company_id);
CREATE INDEX IF NOT EXISTS idx_product_charges_company ON product_charges(company_id);

-- ── DONE ───────────────────────────────────────────────────────
-- This script is safe to re-run multiple times.
-- All your existing data is preserved.
