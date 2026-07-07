-- ============================================================
-- ABD STOCK - Fix Stock Level Update Null Variant Bug
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION fn_update_stock_level(
  p_company_id UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_warehouse_id UUID,
  p_quantity DECIMAL,
  p_unit_cost DECIMAL DEFAULT 0,
  p_movement_type movement_type DEFAULT 'adjustment',
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_qty DECIMAL;
  v_current_avg_cost DECIMAL;
  v_new_qty DECIMAL;
  v_new_avg_cost DECIMAL;
  v_total_cost DECIMAL;
BEGIN
  -- Get current stock
  SELECT qty_on_hand, avg_cost INTO v_current_qty, v_current_avg_cost
  FROM stock_levels
  WHERE product_id = p_product_id
    AND COALESCE(variant_id::TEXT, '') = COALESCE(p_variant_id::TEXT, '')
    AND warehouse_id = p_warehouse_id;

  IF NOT FOUND THEN
    v_current_qty := 0;
    v_current_avg_cost := 0;
  END IF;

  v_new_qty := v_current_qty + p_quantity;
  v_total_cost := ABS(p_quantity) * p_unit_cost;

  -- Calculate new weighted average cost (only for positive movements)
  IF p_quantity > 0 AND p_unit_cost > 0 THEN
    IF v_current_qty + p_quantity > 0 THEN
      v_new_avg_cost := (v_current_qty * COALESCE(v_current_avg_cost, 0) + p_quantity * p_unit_cost) / (v_current_qty + p_quantity);
    ELSE
      v_new_avg_cost := p_unit_cost;
    END IF;
  ELSE
    v_new_avg_cost := COALESCE(v_current_avg_cost, 0);
  END IF;

  -- Upsert stock level manually to handle NULL variant_id (Postgres UNIQUE index null issue)
  IF p_variant_id IS NULL THEN
    UPDATE stock_levels 
    SET qty_on_hand = GREATEST(0, v_new_qty),
        avg_cost = v_new_avg_cost,
        updated_at = NOW()
    WHERE product_id = p_product_id AND variant_id IS NULL AND warehouse_id = p_warehouse_id;
  ELSE
    UPDATE stock_levels 
    SET qty_on_hand = GREATEST(0, v_new_qty),
        avg_cost = v_new_avg_cost,
        updated_at = NOW()
    WHERE product_id = p_product_id AND variant_id = p_variant_id AND warehouse_id = p_warehouse_id;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO stock_levels (company_id, product_id, variant_id, warehouse_id, qty_on_hand, avg_cost)
    VALUES (p_company_id, p_product_id, p_variant_id, p_warehouse_id, GREATEST(0, v_new_qty), v_new_avg_cost);
  END IF;

  -- Record stock movement
  INSERT INTO stock_movements (
    company_id, product_id, variant_id, warehouse_id,
    movement_type, quantity, unit_cost, total_cost,
    qty_before, qty_after, ref_type, ref_id, notes, created_by
  ) VALUES (
    p_company_id, p_product_id, p_variant_id, p_warehouse_id,
    p_movement_type, p_quantity, p_unit_cost, v_total_cost,
    v_current_qty, v_new_qty, p_ref_type, p_ref_id, p_notes, p_created_by
  );

  -- Check for low stock notification
  PERFORM fn_check_low_stock(p_company_id, p_product_id, p_warehouse_id, v_new_qty);
END;
$$;
