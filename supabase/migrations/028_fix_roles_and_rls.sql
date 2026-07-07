-- ============================================================
-- ABD STOCK - Fix Roles and RLS Infinite Recursion
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Fix Helper Functions to prevent SQL inlining (which causes infinite recursion in policies)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION is_moderator_or_higher()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'moderator', 'commerce_manager')
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

-- 2. Restrict V2 Policies so 'viewer' cannot edit
-- Drop existing staff_manage policies for v2 tables
DROP POLICY IF EXISTS "staff_manage_product_charges" ON product_charges;
DROP POLICY IF EXISTS "staff_manage_commands" ON commands;
DROP POLICY IF EXISTS "staff_manage_command_items" ON command_items;
DROP POLICY IF EXISTS "staff_manage_components" ON components;
DROP POLICY IF EXISTS "staff_manage_recipes" ON recipes;
DROP POLICY IF EXISTS "staff_manage_recipe_items" ON recipe_items;
DROP POLICY IF EXISTS "staff_manage_recipe_outputs" ON recipe_outputs;
DROP POLICY IF EXISTS "staff_manage_recipe_charges" ON recipe_charges;
DROP POLICY IF EXISTS "staff_manage_recipe_executions" ON recipe_executions;
DROP POLICY IF EXISTS "staff_manage_customer_debt_payments" ON customer_debt_payments;
DROP POLICY IF EXISTS "staff_manage_whatsapp_sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "staff_manage_whatsapp_templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "staff_manage_whatsapp_messages" ON whatsapp_messages;

-- Recreate them with role check
CREATE POLICY "staff_manage_product_charges" ON product_charges
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

CREATE POLICY "staff_manage_commands" ON commands
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

CREATE POLICY "staff_manage_command_items" ON command_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM commands WHERE id = command_items.command_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );

CREATE POLICY "staff_manage_components" ON components
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

CREATE POLICY "staff_manage_recipes" ON recipes
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

CREATE POLICY "staff_manage_recipe_items" ON recipe_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_items.recipe_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );

CREATE POLICY "staff_manage_recipe_outputs" ON recipe_outputs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_outputs.recipe_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );

CREATE POLICY "staff_manage_recipe_charges" ON recipe_charges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_charges.recipe_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );

CREATE POLICY "staff_manage_recipe_executions" ON recipe_executions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_executions.recipe_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );

CREATE POLICY "staff_manage_customer_debt_payments" ON customer_debt_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM customers WHERE id = customer_debt_payments.customer_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );

CREATE POLICY "staff_manage_whatsapp_sessions" ON whatsapp_sessions
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

CREATE POLICY "staff_manage_whatsapp_templates" ON whatsapp_templates
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

CREATE POLICY "staff_manage_whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

-- Also restrict core tables for viewers
DROP POLICY IF EXISTS "company_manage_products" ON products;
CREATE POLICY "company_manage_products" ON products
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

DROP POLICY IF EXISTS "company_manage_variants" ON product_variants;
CREATE POLICY "company_manage_variants" ON product_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_variants.product_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );
