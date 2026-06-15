-- =====================================================
-- ABD STOCK - Seed Admin and Mod Users
-- =====================================================

-- This script creates 1 Super Admin and 2 Mods directly in the database.
-- It bypasses email confirmation.
-- Default Password for all users: m=4C%z&7&s&+kA#

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_company_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
  v_branch_id UUID := '00000000-0000-0000-0000-000000000003'::UUID;
  
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_mod1_id UUID := gen_random_uuid();
  v_mod2_id UUID := gen_random_uuid();
BEGIN

  -- 1. Create Super Admin User in auth.users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES 
  (v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@abdstock.com', crypt('m=4C%z&7&s&+kA#', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Super Admin"}', now(), now(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create Mod 1 in auth.users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES 
  (v_mod1_id, '00000000-0000-0000-0000-000000000000', 'mod1@abdstock.com', crypt('m=4C%z&7&s&+kA#', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Moderator 1"}', now(), now(), 'authenticated', 'authenticated');

  -- 3. Create Mod 2 in auth.users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES 
  (v_mod2_id, '00000000-0000-0000-0000-000000000000', 'mod2@abdstock.com', crypt('m=4C%z&7&s&+kA#', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Moderator 2"}', now(), now(), 'authenticated', 'authenticated');


  -- 4. Insert into public.profiles
  INSERT INTO public.profiles (id, company_id, branch_id, email, full_name, role)
  VALUES
  (v_admin_id, v_company_id, v_branch_id, 'admin@abdstock.com', 'Super Admin', 'super_admin')
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

  INSERT INTO public.profiles (id, company_id, branch_id, email, full_name, role)
  VALUES
  (v_mod1_id, v_company_id, v_branch_id, 'mod1@abdstock.com', 'Moderator 1', 'branch_manager');

  INSERT INTO public.profiles (id, company_id, branch_id, email, full_name, role)
  VALUES
  (v_mod2_id, v_company_id, v_branch_id, 'mod2@abdstock.com', 'Moderator 2', 'branch_manager');

END $$;
