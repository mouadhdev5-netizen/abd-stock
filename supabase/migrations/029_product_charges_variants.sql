-- ============================================================
-- ABD STOCK - Add variant_id to product_charges
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE product_charges 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
