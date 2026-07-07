-- ============================================================
-- ABD STOCK - Fix Missing RLS Policies for V2 Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable RLS on all new v2 tables
ALTER TABLE product_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ── product_charges ───────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_product_charges" ON product_charges;
DROP POLICY IF EXISTS "staff_manage_product_charges" ON product_charges;

CREATE POLICY "company_see_product_charges" ON product_charges
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_product_charges" ON product_charges
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── commands ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_commands" ON commands;
DROP POLICY IF EXISTS "staff_manage_commands" ON commands;

CREATE POLICY "company_see_commands" ON commands
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_commands" ON commands
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── command_items ─────────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_command_items" ON command_items;
DROP POLICY IF EXISTS "staff_manage_command_items" ON command_items;

CREATE POLICY "company_see_command_items" ON command_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM commands WHERE id = command_items.command_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "staff_manage_command_items" ON command_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM commands WHERE id = command_items.command_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

-- ── components ────────────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_components" ON components;
DROP POLICY IF EXISTS "staff_manage_components" ON components;

CREATE POLICY "company_see_components" ON components
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_components" ON components
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── recipes ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_recipes" ON recipes;
DROP POLICY IF EXISTS "staff_manage_recipes" ON recipes;

CREATE POLICY "company_see_recipes" ON recipes
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_recipes" ON recipes
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── recipe_items ──────────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_recipe_items" ON recipe_items;
DROP POLICY IF EXISTS "staff_manage_recipe_items" ON recipe_items;

CREATE POLICY "company_see_recipe_items" ON recipe_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_items.recipe_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "staff_manage_recipe_items" ON recipe_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_items.recipe_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

-- ── recipe_outputs ────────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_recipe_outputs" ON recipe_outputs;
DROP POLICY IF EXISTS "staff_manage_recipe_outputs" ON recipe_outputs;

CREATE POLICY "company_see_recipe_outputs" ON recipe_outputs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_outputs.recipe_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "staff_manage_recipe_outputs" ON recipe_outputs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_outputs.recipe_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

-- ── recipe_charges ────────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_recipe_charges" ON recipe_charges;
DROP POLICY IF EXISTS "staff_manage_recipe_charges" ON recipe_charges;

CREATE POLICY "company_see_recipe_charges" ON recipe_charges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_charges.recipe_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "staff_manage_recipe_charges" ON recipe_charges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes WHERE id = recipe_charges.recipe_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

-- ── recipe_executions ─────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_recipe_executions" ON recipe_executions;
DROP POLICY IF EXISTS "staff_manage_recipe_executions" ON recipe_executions;

CREATE POLICY "company_see_recipe_executions" ON recipe_executions
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_recipe_executions" ON recipe_executions
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── customer_debt_payments ────────────────────────────────────
DROP POLICY IF EXISTS "company_see_debt_payments" ON customer_debt_payments;
DROP POLICY IF EXISTS "staff_manage_debt_payments" ON customer_debt_payments;

CREATE POLICY "company_see_debt_payments" ON customer_debt_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = customer_debt_payments.customer_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "staff_manage_debt_payments" ON customer_debt_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM customers WHERE id = customer_debt_payments.customer_id AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  );

-- ── whatsapp_sessions ─────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_whatsapp_sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "staff_manage_whatsapp_sessions" ON whatsapp_sessions;

CREATE POLICY "company_see_whatsapp_sessions" ON whatsapp_sessions
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_whatsapp_sessions" ON whatsapp_sessions
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── whatsapp_templates ────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_whatsapp_templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "staff_manage_whatsapp_templates" ON whatsapp_templates;

CREATE POLICY "company_see_whatsapp_templates" ON whatsapp_templates
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_whatsapp_templates" ON whatsapp_templates
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── whatsapp_messages ─────────────────────────────────────────
DROP POLICY IF EXISTS "company_see_whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "staff_manage_whatsapp_messages" ON whatsapp_messages;

CREATE POLICY "company_see_whatsapp_messages" ON whatsapp_messages
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff_manage_whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
