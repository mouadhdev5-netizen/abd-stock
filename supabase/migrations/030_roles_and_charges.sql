-- ============================================================
-- ABD STOCK - Fix RPC and enforce Viewer Restrictions
-- ============================================================

-- 1. Fix create_company_user RPC to avoid 409 Conflict if profile is auto-created by a trigger
CREATE OR REPLACE FUNCTION create_company_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_company_id UUID,
  p_branch_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- 1. Check if email already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- 2. Generate UUID and encrypt password
  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- 3. Insert into auth.users (Supabase Authentication)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', p_email, encrypted_pw, 
    now(), '{"provider":"email","providers":["email"]}', '{}', 
    now(), now(), '', '', '', ''
  );

  -- 4. Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
  ) VALUES (
    gen_random_uuid(), new_user_id, format('{"sub":"%s","email":"%s"}', new_user_id::text, p_email)::jsonb, 'email', now(), now(), now(), new_user_id::text
  );

  -- 5. Upsert into public.profiles to prevent 409 duplicate key errors if an auth trigger exists
  INSERT INTO public.profiles (id, company_id, email, full_name, role, branch_id, is_active)
  VALUES (new_user_id, p_company_id, p_email, p_full_name, p_role::public.user_role, p_branch_id, true)
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id,
    is_active = EXCLUDED.is_active;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Prevent viewer from modifying any data on additional tables if not covered
DROP POLICY IF EXISTS "company_manage_sales" ON sales_orders;
CREATE POLICY "company_manage_sales" ON sales_orders
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

DROP POLICY IF EXISTS "company_manage_sale_items" ON sales_order_items;
CREATE POLICY "company_manage_sale_items" ON sales_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sales_orders WHERE id = sales_order_items.so_id AND company_id = get_user_company_id())
    AND get_user_role() != 'viewer'
  );

DROP POLICY IF EXISTS "staff_manage_stock_movements" ON stock_movements;
CREATE POLICY "staff_manage_stock_movements" ON stock_movements
  FOR ALL USING (company_id = get_user_company_id() AND get_user_role() != 'viewer');

-- Ensure profiles can be fetched correctly
-- We ensure the company profile RLS doesn't restrict fetching a new user's profile
-- This is already mostly covered by: company_id = get_user_company_id()
