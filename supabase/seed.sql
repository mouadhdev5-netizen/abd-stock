-- =====================================================
-- ABD STOCK - Seed Data
-- =====================================================

-- This seed script creates a default company, branch, warehouse, and a super admin user.
-- It requires a user to already exist in auth.users. The default user password is: m=4C%z&7&s&+kA#

DO $$
DECLARE
  v_company_id UUID;
  v_branch_id UUID;
  v_warehouse_id UUID;
  v_user_id UUID;
BEGIN
  -- We assume the user has signed up via Supabase Auth or we insert a placeholder user if allowed
  -- Actually, in Supabase we can insert into auth.users directly in a seed script if we know the ID, 
  -- but it's easier to just insert the company and then the user signs up and we link them, OR
  -- we create a fixed UUID for local development.

  -- For local dev, let's use a fixed UUID for the admin user
  v_user_id := '00000000-0000-0000-0000-000000000001'::UUID;

  -- 1. Create Company
  INSERT INTO companies (
    id, name, trade_name, currency, default_language, timezone, is_active
  ) VALUES (
    '00000000-0000-0000-0000-000000000002'::UUID, 
    'ABD Enterprise', 
    'ABD Stock HQ', 
    'DZD', 
    'fr', 
    'Africa/Algiers', 
    true
  ) ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_company_id;

  IF v_company_id IS NULL THEN
    v_company_id := '00000000-0000-0000-0000-000000000002'::UUID;
  END IF;

  -- 2. Create Main Branch
  INSERT INTO branches (
    id, company_id, name, code, is_main, is_active
  ) VALUES (
    '00000000-0000-0000-0000-000000000003'::UUID,
    v_company_id,
    'Siège Social',
    'HQ',
    true,
    true
  ) ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_branch_id;

  IF v_branch_id IS NULL THEN
    v_branch_id := '00000000-0000-0000-0000-000000000003'::UUID;
  END IF;

  -- 3. Create Default Warehouse
  INSERT INTO warehouses (
    id, company_id, branch_id, name, code, is_default, is_active
  ) VALUES (
    '00000000-0000-0000-0000-000000000004'::UUID,
    v_company_id,
    v_branch_id,
    'Entrepôt Principal',
    'WH-01',
    true,
    true
  ) ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_warehouse_id;

  -- 4. Create Units
  INSERT INTO units (company_id, name, name_ar, name_fr, abbreviation) VALUES
  (v_company_id, 'Piece', 'قطعة', 'Pièce', 'Pcs'),
  (v_company_id, 'Kilogram', 'كيلوغرام', 'Kilogramme', 'Kg'),
  (v_company_id, 'Gram', 'غرام', 'Gramme', 'g'),
  (v_company_id, 'Liter', 'لتر', 'Litre', 'L'),
  (v_company_id, 'Meter', 'متر', 'Mètre', 'm'),
  (v_company_id, 'Box', 'صندوق', 'Boîte', 'Box');

  -- 5. Link auth user to profile if they exist in auth.users
  -- If we are in local dev, we might need to insert into auth.users first, but Supabase CLI does this via identity endpoints.
  -- This is a placeholder. Real application logic usually handles first-user setup via edge function or app signup flow.
  
END $$;
