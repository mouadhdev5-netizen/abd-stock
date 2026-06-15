-- =====================================================
-- ABD STOCK - Migration 002: Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_sequences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Check if current user is moderator or higher
CREATE OR REPLACE FUNCTION is_moderator_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'moderator')
  );
$$;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE profile_id = auth.uid() AND permission = perm AND granted = true
  ) OR is_moderator_or_higher();
$$;

-- =====================================================
-- COMPANIES RLS
-- =====================================================

CREATE POLICY "users_see_own_company" ON companies
  FOR SELECT USING (
    id = get_user_company_id() OR is_super_admin()
  );

CREATE POLICY "super_admin_manage_companies" ON companies
  FOR ALL USING (is_super_admin());

CREATE POLICY "moderator_update_company" ON companies
  FOR UPDATE USING (id = get_user_company_id() AND is_moderator_or_higher());

-- =====================================================
-- BRANCHES RLS
-- =====================================================

CREATE POLICY "users_see_company_branches" ON branches
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

CREATE POLICY "moderator_manage_branches" ON branches
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

-- =====================================================
-- PROFILES RLS
-- =====================================================

CREATE POLICY "users_see_own_profile" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR company_id = get_user_company_id() OR is_super_admin()
  );

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "moderator_manage_profiles" ON profiles
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

CREATE POLICY "allow_profile_creation" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- =====================================================
-- USER PERMISSIONS RLS
-- =====================================================

CREATE POLICY "users_see_own_permissions" ON user_permissions
  FOR SELECT USING (
    profile_id = auth.uid() OR is_moderator_or_higher()
  );

CREATE POLICY "moderator_manage_permissions" ON user_permissions
  FOR ALL USING (is_moderator_or_higher());

-- =====================================================
-- WAREHOUSES RLS
-- =====================================================

CREATE POLICY "company_see_warehouses" ON warehouses
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

CREATE POLICY "moderator_manage_warehouses" ON warehouses
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

-- =====================================================
-- CATEGORIES RLS
-- =====================================================

CREATE POLICY "company_see_categories" ON categories
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "moderator_manage_categories" ON categories
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

-- =====================================================
-- BRANDS RLS
-- =====================================================

CREATE POLICY "company_see_brands" ON brands
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "moderator_manage_brands" ON brands
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

-- =====================================================
-- UNITS RLS
-- =====================================================

CREATE POLICY "company_see_units" ON units
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "moderator_manage_units" ON units
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

-- =====================================================
-- SUPPLIERS RLS
-- =====================================================

CREATE POLICY "company_see_suppliers" ON suppliers
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_suppliers" ON suppliers
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- SUPPLIER CONTACTS RLS
-- =====================================================

CREATE POLICY "company_see_supplier_contacts" ON supplier_contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM suppliers WHERE id = supplier_contacts.supplier_id AND company_id = get_user_company_id())
    OR is_super_admin()
  );

CREATE POLICY "staff_manage_supplier_contacts" ON supplier_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM suppliers WHERE id = supplier_contacts.supplier_id AND company_id = get_user_company_id())
    OR is_super_admin()
  );

-- =====================================================
-- CUSTOMERS RLS
-- =====================================================

CREATE POLICY "company_see_customers" ON customers
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_customers" ON customers
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- CUSTOMER ADDRESSES RLS
-- =====================================================

CREATE POLICY "company_see_customer_addresses" ON customer_addresses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = customer_addresses.customer_id AND company_id = get_user_company_id())
    OR is_super_admin()
  );

CREATE POLICY "staff_manage_customer_addresses" ON customer_addresses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM customers WHERE id = customer_addresses.customer_id AND company_id = get_user_company_id())
    OR is_super_admin()
  );

-- =====================================================
-- CUSTOMER GROUPS RLS
-- =====================================================

CREATE POLICY "company_see_customer_groups" ON customer_groups
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "moderator_manage_customer_groups" ON customer_groups
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

-- =====================================================
-- PRODUCTS RLS
-- =====================================================

CREATE POLICY "company_see_products" ON products
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_products" ON products
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- PRODUCT VARIANTS RLS
-- =====================================================

CREATE POLICY "company_see_product_variants" ON product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_variants.product_id AND company_id = get_user_company_id())
    OR is_super_admin()
  );

CREATE POLICY "staff_manage_product_variants" ON product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_variants.product_id AND company_id = get_user_company_id())
    OR is_super_admin()
  );

-- =====================================================
-- STOCK LEVELS RLS
-- =====================================================

CREATE POLICY "company_see_stock_levels" ON stock_levels
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "system_manage_stock_levels" ON stock_levels
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- STOCK MOVEMENTS RLS
-- =====================================================

CREATE POLICY "company_see_stock_movements" ON stock_movements
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_create_stock_movements" ON stock_movements
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- =====================================================
-- INVENTORY COUNTS RLS
-- =====================================================

CREATE POLICY "company_see_inventory_counts" ON inventory_counts
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_inventory_counts" ON inventory_counts
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- WAREHOUSE TRANSFERS RLS
-- =====================================================

CREATE POLICY "company_see_transfers" ON warehouse_transfers
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_transfers" ON warehouse_transfers
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- PURCHASE ORDERS RLS
-- =====================================================

CREATE POLICY "company_see_purchase_orders" ON purchase_orders
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_purchase_orders" ON purchase_orders
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- SALES ORDERS RLS
-- =====================================================

CREATE POLICY "company_see_sales_orders" ON sales_orders
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_sales_orders" ON sales_orders
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- Employee can only see their own sales
CREATE POLICY "employee_see_own_sales" ON sales_orders
  FOR SELECT USING (
    (company_id = get_user_company_id() AND (
      get_user_role() IN ('super_admin', 'moderator')
      OR employee_id = auth.uid()
    )) OR is_super_admin()
  );

-- =====================================================
-- INVOICES RLS
-- =====================================================

CREATE POLICY "company_see_invoices" ON invoices
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_invoices" ON invoices
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- PAYMENTS RLS
-- =====================================================

CREATE POLICY "company_see_payments" ON payments
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_payments" ON payments
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- =====================================================
-- DELIVERIES RLS
-- =====================================================

CREATE POLICY "company_see_deliveries" ON deliveries
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "staff_manage_deliveries" ON deliveries
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );

-- Driver sees only assigned deliveries
CREATE POLICY "driver_see_assigned_deliveries" ON deliveries
  FOR SELECT USING (
    (company_id = get_user_company_id() AND (
      is_moderator_or_higher() OR driver_id = auth.uid()
    )) OR is_super_admin()
  );

-- =====================================================
-- EXPENSES RLS
-- =====================================================

CREATE POLICY "company_see_expenses" ON expenses
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "moderator_manage_expenses" ON expenses
  FOR ALL USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

-- =====================================================
-- NOTIFICATIONS RLS
-- =====================================================

CREATE POLICY "users_see_own_notifications" ON notifications
  FOR SELECT USING (
    (company_id = get_user_company_id() AND (user_id = auth.uid() OR user_id IS NULL))
    OR is_super_admin()
  );

CREATE POLICY "system_create_notifications" ON notifications
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- AUDIT LOGS RLS
-- =====================================================

CREATE POLICY "moderator_see_audit_logs" ON audit_logs
  FOR SELECT USING (
    (company_id = get_user_company_id() AND is_moderator_or_higher()) OR is_super_admin()
  );

CREATE POLICY "system_create_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true); -- system inserts only

-- =====================================================
-- COMPANY SEQUENCES RLS
-- =====================================================

CREATE POLICY "company_see_sequences" ON company_sequences
  FOR SELECT USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "company_manage_sequences" ON company_sequences
  FOR ALL USING (
    company_id = get_user_company_id() OR is_super_admin()
  );
