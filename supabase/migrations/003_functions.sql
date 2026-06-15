-- =====================================================
-- ABD STOCK - Migration 003: Functions, Triggers & Views
-- =====================================================

-- =====================================================
-- SEQUENCE GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_sequence_number(
  p_company_id UUID,
  p_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix TEXT;
  v_last_number BIGINT;
  v_padding INT;
  v_new_number BIGINT;
BEGIN
  -- Upsert the sequence record
  INSERT INTO company_sequences (company_id, sequence_type, prefix, last_number, padding)
  VALUES (p_company_id, p_type, p_type || '-', 0, 5)
  ON CONFLICT (company_id, sequence_type) DO NOTHING;

  -- Lock and increment
  UPDATE company_sequences
  SET last_number = last_number + 1
  WHERE company_id = p_company_id AND sequence_type = p_type
  RETURNING prefix, last_number, padding INTO v_prefix, v_new_number, v_padding;

  RETURN v_prefix || LPAD(v_new_number::TEXT, v_padding, '0');
END;
$$;

-- =====================================================
-- AUTO-SET TIMESTAMPS TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_customer_groups_updated_at BEFORE UPDATE ON customer_groups FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_product_batches_updated_at BEFORE UPDATE ON product_batches FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_stock_levels_updated_at BEFORE UPDATE ON stock_levels FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_inventory_counts_updated_at BEFORE UPDATE ON inventory_counts FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_warehouse_transfers_updated_at BEFORE UPDATE ON warehouse_transfers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_sales_returns_updated_at BEFORE UPDATE ON sales_returns FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =====================================================
-- STOCK UPDATE FUNCTION (core inventory logic)
-- =====================================================

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

  -- Upsert stock level
  INSERT INTO stock_levels (company_id, product_id, variant_id, warehouse_id, qty_on_hand, avg_cost)
  VALUES (p_company_id, p_product_id, p_variant_id, p_warehouse_id, GREATEST(0, v_new_qty), v_new_avg_cost)
  ON CONFLICT (product_id, variant_id, warehouse_id) 
  DO UPDATE SET
    qty_on_hand = GREATEST(0, v_new_qty),
    avg_cost = v_new_avg_cost,
    updated_at = NOW();

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

-- =====================================================
-- LOW STOCK NOTIFICATION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION fn_check_low_stock(
  p_company_id UUID,
  p_product_id UUID,
  p_warehouse_id UUID,
  p_current_qty DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_notif_type notification_type;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Determine notification type
  IF p_current_qty <= 0 THEN
    v_notif_type := 'out_of_stock';
  ELSIF v_product.reorder_level > 0 AND p_current_qty <= v_product.reorder_level THEN
    v_notif_type := 'low_stock';
  ELSE
    RETURN; -- No notification needed
  END IF;

  -- Check if similar notification was sent in last 24 hours
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE company_id = p_company_id
      AND type = v_notif_type
      AND ref_type = 'product'
      AND ref_id = p_product_id
      AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    INSERT INTO notifications (company_id, type, title, title_ar, title_fr, body, body_ar, body_fr, ref_type, ref_id)
    VALUES (
      p_company_id,
      v_notif_type,
      CASE v_notif_type WHEN 'out_of_stock' THEN 'Out of Stock Alert' ELSE 'Low Stock Alert' END,
      CASE v_notif_type WHEN 'out_of_stock' THEN 'تنبيه نفاد المخزون' ELSE 'تنبيه انخفاض المخزون' END,
      CASE v_notif_type WHEN 'out_of_stock' THEN 'Alerte rupture de stock' ELSE 'Alerte stock bas' END,
      v_product.name || ' is ' || CASE v_notif_type WHEN 'out_of_stock' THEN 'out of stock' ELSE 'running low (' || p_current_qty || ' remaining)' END,
      v_product.name || CASE v_notif_type WHEN 'out_of_stock' THEN ' نفد من المخزون' ELSE ' مخزونه منخفض (' || p_current_qty || ' متبقي)' END,
      v_product.name || CASE v_notif_type WHEN 'out_of_stock' THEN ' est en rupture de stock' ELSE ' a un stock bas (' || p_current_qty || ' restant)' END,
      'product',
      p_product_id
    );
  END IF;
END;
$$;

-- =====================================================
-- PURCHASE ORDER RECEIVE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION fn_receive_purchase_order(
  p_po_id UUID,
  p_warehouse_id UUID,
  p_items JSONB, -- [{po_item_id, quantity, unit_cost, batch_id?}]
  p_received_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po purchase_orders%ROWTYPE;
  v_receipt_id UUID;
  v_receipt_number TEXT;
  v_item JSONB;
  v_po_item purchase_order_items%ROWTYPE;
  v_total_received DECIMAL;
BEGIN
  -- Get PO
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status NOT IN ('approved', 'ordered', 'partial') THEN 
    RAISE EXCEPTION 'Purchase order must be approved before receiving'; 
  END IF;

  -- Generate receipt number
  v_receipt_number := generate_sequence_number(v_po.company_id, 'RCPT');

  -- Create receipt
  INSERT INTO purchase_receipts (po_id, company_id, warehouse_id, receipt_number, received_by)
  VALUES (p_po_id, v_po.company_id, p_warehouse_id, v_receipt_number, p_received_by)
  RETURNING id INTO v_receipt_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_po_item FROM purchase_order_items 
    WHERE id = (v_item->>'po_item_id')::UUID;

    IF NOT FOUND THEN CONTINUE; END IF;

    -- Insert receipt item
    INSERT INTO purchase_receipt_items (receipt_id, po_item_id, product_id, quantity, unit_cost, batch_id)
    VALUES (
      v_receipt_id,
      v_po_item.id,
      v_po_item.product_id,
      (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_cost')::DECIMAL,
      (v_item->>'batch_id')::UUID
    );

    -- Update received quantity on PO item
    UPDATE purchase_order_items
    SET received_qty = received_qty + (v_item->>'quantity')::DECIMAL
    WHERE id = v_po_item.id;

    -- Update stock
    PERFORM fn_update_stock_level(
      v_po.company_id,
      v_po_item.product_id,
      v_po_item.variant_id,
      p_warehouse_id,
      (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_cost')::DECIMAL,
      'purchase',
      'purchase_order',
      p_po_id,
      'Purchase order ' || v_po.po_number,
      p_received_by
    );
  END LOOP;

  -- Check if fully received
  SELECT SUM(quantity - received_qty) INTO v_total_received
  FROM purchase_order_items WHERE po_id = p_po_id;

  IF v_total_received <= 0 THEN
    UPDATE purchase_orders SET status = 'received' WHERE id = p_po_id;
  ELSE
    UPDATE purchase_orders SET status = 'partial' WHERE id = p_po_id;
  END IF;

  RETURN v_receipt_id;
END;
$$;

-- =====================================================
-- CONFIRM SALE FUNCTION (deduct stock)
-- =====================================================

CREATE OR REPLACE FUNCTION fn_confirm_sale(
  p_so_id UUID,
  p_confirmed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_so sales_orders%ROWTYPE;
  v_item sales_order_items%ROWTYPE;
  v_warehouse_id UUID;
BEGIN
  SELECT * INTO v_so FROM sales_orders WHERE id = p_so_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sales order not found'; END IF;
  IF v_so.status NOT IN ('draft', 'confirmed') THEN 
    RAISE EXCEPTION 'Sales order cannot be confirmed'; 
  END IF;

  -- Get default warehouse
  v_warehouse_id := v_so.warehouse_id;
  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id FROM warehouses 
    WHERE company_id = v_so.company_id AND is_default = true LIMIT 1;
  END IF;

  -- Deduct stock for each item
  FOR v_item IN SELECT * FROM sales_order_items WHERE so_id = p_so_id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = v_item.product_id AND is_service = true) THEN
      PERFORM fn_update_stock_level(
        v_so.company_id,
        v_item.product_id,
        v_item.variant_id,
        v_warehouse_id,
        -v_item.quantity, -- negative = deduct
        v_item.cost_price,
        'sale',
        'sales_order',
        p_so_id,
        'Sale ' || v_so.so_number,
        p_confirmed_by
      );
    END IF;
  END LOOP;

  -- Update status
  UPDATE sales_orders SET status = 'confirmed' WHERE id = p_so_id;

  -- Create invoice
  PERFORM fn_create_invoice_for_sale(p_so_id, p_confirmed_by);
END;
$$;

-- =====================================================
-- CREATE INVOICE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION fn_create_invoice_for_sale(
  p_so_id UUID,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_so sales_orders%ROWTYPE;
  v_invoice_id UUID;
  v_invoice_number TEXT;
BEGIN
  SELECT * INTO v_so FROM sales_orders WHERE id = p_so_id;

  v_invoice_number := generate_sequence_number(v_so.company_id, 'INV');

  INSERT INTO invoices (company_id, so_id, invoice_number, status, total, paid_amount, due_at)
  VALUES (
    v_so.company_id,
    p_so_id,
    v_invoice_number,
    'sent',
    v_so.total,
    v_so.paid_amount,
    CASE WHEN v_so.due_date IS NOT NULL THEN v_so.due_date::TIMESTAMPTZ ELSE NULL END
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- =====================================================
-- RECORD PAYMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION fn_record_payment(
  p_company_id UUID,
  p_so_id UUID,
  p_amount DECIMAL,
  p_method payment_method,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_payment_number TEXT;
  v_invoice_id UUID;
  v_total_paid DECIMAL;
  v_invoice_total DECIMAL;
BEGIN
  v_payment_number := generate_sequence_number(p_company_id, 'PMT');

  -- Get associated invoice
  SELECT id, total INTO v_invoice_id, v_invoice_total
  FROM invoices WHERE so_id = p_so_id LIMIT 1;

  -- Record payment
  INSERT INTO payments (company_id, so_id, invoice_id, payment_number, amount, method, reference, notes, created_by)
  VALUES (p_company_id, p_so_id, v_invoice_id, v_payment_number, p_amount, p_method, p_reference, p_notes, p_created_by)
  RETURNING id INTO v_payment_id;

  -- Update sales order paid amount
  UPDATE sales_orders
  SET paid_amount = paid_amount + p_amount,
      status = CASE WHEN paid_amount + p_amount >= total THEN 'completed' ELSE 'partial' END
  WHERE id = p_so_id;

  -- Update invoice
  IF v_invoice_id IS NOT NULL THEN
    SELECT SUM(amount) INTO v_total_paid FROM payments WHERE invoice_id = v_invoice_id;
    
    UPDATE invoices
    SET paid_amount = v_total_paid,
        status = CASE 
          WHEN v_total_paid >= v_invoice_total THEN 'paid'::invoice_status
          WHEN v_total_paid > 0 THEN 'partial'::invoice_status
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_invoice_id;
  END IF;

  -- Update customer loyalty points (1 point per 100 DZD)
  UPDATE customers c
  SET loyalty_points = loyalty_points + FLOOR(p_amount / 100)
  FROM sales_orders so
  WHERE so.id = p_so_id AND so.customer_id = c.id;

  RETURN v_payment_id;
END;
$$;

-- =====================================================
-- AUDIT LOG TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_action TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  v_action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    -- Try to get company_id from old record
    BEGIN
      v_company_id := OLD.company_id;
    EXCEPTION WHEN OTHERS THEN
      v_company_id := NULL;
    END;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    BEGIN
      v_company_id := NEW.company_id;
    EXCEPTION WHEN OTHERS THEN
      v_company_id := NULL;
    END;
  ELSE -- UPDATE
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    BEGIN
      v_company_id := NEW.company_id;
    EXCEPTION WHEN OTHERS THEN
      v_company_id := NULL;
    END;
  END IF;

  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    v_company_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_old_data,
    v_new_data
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_sales_orders AFTER INSERT OR UPDATE OR DELETE ON sales_orders FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_stock_movements AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =====================================================
-- ANALYTICS VIEWS
-- =====================================================

-- Dashboard summary view
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  so.company_id,
  DATE_TRUNC('day', so.created_at) AS sale_date,
  COUNT(DISTINCT so.id) AS total_orders,
  SUM(so.total) AS total_revenue,
  SUM(so.profit_amount) AS total_profit,
  SUM(so.paid_amount) AS total_paid,
  SUM(so.due_amount) AS total_due
FROM sales_orders so
WHERE so.status NOT IN ('cancelled', 'returned', 'quotation')
GROUP BY so.company_id, DATE_TRUNC('day', so.created_at);

-- Product stock summary view
CREATE OR REPLACE VIEW v_product_stock AS
SELECT
  p.id AS product_id,
  p.company_id,
  p.name,
  p.sku,
  p.barcode,
  p.status,
  p.reorder_level,
  p.min_stock,
  p.max_stock,
  p.cost_price,
  p.sell_price,
  c.name AS category_name,
  b.name AS brand_name,
  COALESCE(SUM(sl.qty_on_hand), 0) AS total_qty_on_hand,
  COALESCE(SUM(sl.qty_reserved), 0) AS total_qty_reserved,
  COALESCE(SUM(sl.qty_available), 0) AS total_qty_available,
  COALESCE(AVG(sl.avg_cost), p.cost_price) AS avg_cost,
  COALESCE(SUM(sl.qty_on_hand) * AVG(sl.avg_cost), 0) AS stock_value,
  CASE 
    WHEN COALESCE(SUM(sl.qty_on_hand), 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(SUM(sl.qty_on_hand), 0) <= p.reorder_level THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN stock_levels sl ON p.id = sl.product_id
GROUP BY p.id, p.company_id, p.name, p.sku, p.barcode, p.status, 
  p.reorder_level, p.min_stock, p.max_stock, p.cost_price, p.sell_price,
  c.name, b.name;

-- Monthly sales analytics view
CREATE OR REPLACE VIEW v_monthly_sales AS
SELECT
  so.company_id,
  DATE_TRUNC('month', so.order_date) AS month,
  COUNT(DISTINCT so.id) AS order_count,
  COUNT(DISTINCT so.customer_id) AS customer_count,
  SUM(so.total) AS total_revenue,
  SUM(so.profit_amount) AS total_profit,
  SUM(so.tax_amount) AS total_tax,
  SUM(so.discount_amount) AS total_discount
FROM sales_orders so
WHERE so.status NOT IN ('cancelled', 'returned', 'quotation')
GROUP BY so.company_id, DATE_TRUNC('month', so.order_date);

-- Top products by sales
CREATE OR REPLACE VIEW v_top_products AS
SELECT
  soi.product_id,
  p.company_id,
  p.name AS product_name,
  p.sku,
  SUM(soi.quantity) AS total_quantity_sold,
  SUM(soi.total) AS total_revenue,
  SUM(soi.profit) AS total_profit,
  COUNT(DISTINCT soi.so_id) AS order_count
FROM sales_order_items soi
JOIN products p ON soi.product_id = p.id
JOIN sales_orders so ON soi.so_id = so.id
WHERE so.status NOT IN ('cancelled', 'returned', 'quotation')
GROUP BY soi.product_id, p.company_id, p.name, p.sku;

-- Supplier balance view
CREATE OR REPLACE VIEW v_supplier_balances AS
SELECT
  s.id AS supplier_id,
  s.company_id,
  s.name AS supplier_name,
  COALESCE(SUM(po.total), 0) AS total_purchases,
  COALESCE(SUM(sp.amount), 0) AS total_paid,
  COALESCE(SUM(po.total), 0) - COALESCE(SUM(sp.amount), 0) AS outstanding_balance
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status NOT IN ('cancelled', 'draft')
LEFT JOIN supplier_payments sp ON s.id = sp.supplier_id
GROUP BY s.id, s.company_id, s.name;

-- Customer balance view
CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
  c.id AS customer_id,
  c.company_id,
  c.name AS customer_name,
  c.loyalty_points,
  COALESCE(SUM(so.total), 0) AS total_sales,
  COALESCE(SUM(p.amount), 0) AS total_paid,
  COALESCE(SUM(so.total), 0) - COALESCE(SUM(p.amount), 0) AS outstanding_balance
FROM customers c
LEFT JOIN sales_orders so ON c.id = so.customer_id AND so.status NOT IN ('cancelled', 'returned', 'quotation')
LEFT JOIN payments p ON so.id = p.so_id
GROUP BY c.id, c.company_id, c.name, c.loyalty_points;

-- =====================================================
-- REALTIME SETUP
-- =====================================================

-- Enable realtime for notifications and stock levels
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_levels;
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_orders;
