-- ============================================================
-- ABD STOCK - Variant Stock View
-- Run this in Supabase SQL Editor
-- ============================================================

DROP VIEW IF EXISTS v_product_variants_stock CASCADE;

CREATE VIEW v_product_variants_stock AS
-- Products WITH variants (flattens into one row per variant)
SELECT
  p.id AS product_id,
  v.id AS variant_id,
  p.company_id,
  p.name AS product_name,
  v.name AS variant_name,
  (p.name || ' - ' || v.name) AS full_name,
  COALESCE(v.sku, p.sku) AS sku,
  COALESCE(v.barcode, p.barcode) AS barcode,
  v.cost_price AS cost_price,
  v.sell_price AS sell_price,
  p.reorder_level,
  p.status,
  true AS is_variant,
  p.thumbnail_url,
  COALESCE(SUM(inv.qty_on_hand), 0) AS total_qty_on_hand,
  COALESCE(SUM(inv.qty_available), 0) AS total_qty_available
FROM products p
JOIN product_variants v ON v.product_id = p.id
LEFT JOIN stock_levels inv ON inv.product_id = p.id AND inv.variant_id = v.id
WHERE p.status != 'discontinued' AND p.has_variants = true AND v.is_active = true
GROUP BY p.id, v.id

UNION ALL

-- Products WITHOUT variants (one row per product)
SELECT
  p.id AS product_id,
  NULL::uuid AS variant_id,
  p.company_id,
  p.name AS product_name,
  NULL AS variant_name,
  p.name AS full_name,
  p.sku,
  p.barcode,
  p.cost_price,
  p.sell_price,
  p.reorder_level,
  p.status,
  false AS is_variant,
  p.thumbnail_url,
  COALESCE(SUM(inv.qty_on_hand), 0) AS total_qty_on_hand,
  COALESCE(SUM(inv.qty_available), 0) AS total_qty_available
FROM products p
LEFT JOIN stock_levels inv ON inv.product_id = p.id AND inv.variant_id IS NULL
WHERE p.status != 'discontinued' AND p.has_variants = false
GROUP BY p.id;
