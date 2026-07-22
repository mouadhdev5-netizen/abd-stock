-- ============================================================
-- ABD STOCK - Fix Missing RLS Policy for purchase_order_items
-- Run this in Supabase SQL Editor
-- ============================================================

-- The purchase_order_items table has RLS enabled (migration 002) but
-- no INSERT/UPDATE/DELETE policy was ever created for it.
-- This means any attempt to write to it fails with a 42501 RLS error.

-- Drop old policies if any exist
DROP POLICY IF EXISTS "company_manage_po_items" ON purchase_order_items;

-- Create a proper RLS policy that allows authenticated staff to manage PO items
-- as long as the parent purchase_order belongs to their company
CREATE POLICY "company_manage_po_items" ON purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE id = purchase_order_items.po_id
        AND company_id = get_user_company_id()
    )
    AND get_user_role() != 'viewer'
  );

-- Also fix sales_order_items if its policy references the old wrong column name
-- The RLS in 030_roles_and_charges.sql references so_id which is correct.
-- This is just a safety re-apply in case it was dropped:
DROP POLICY IF EXISTS "company_manage_sale_items" ON sales_order_items;
CREATE POLICY "company_manage_sale_items" ON sales_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE id = sales_order_items.so_id
        AND company_id = get_user_company_id()
    )
    AND get_user_role() != 'viewer'
  );
