DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN

  -- Insert identity for admin
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    v_admin_id::text, 
    v_admin_id, 
    format('{"sub":"%s","email":"%s"}', v_admin_id::text, 'admin@abdstock.com')::jsonb, 
    'email', 
    now(), 
    now()
  ) ON CONFLICT DO NOTHING;

  -- Insert identities for moderators (since we generated random UUIDs in the previous script, we need to find them by email)
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  SELECT 
    gen_random_uuid(),
    id::text,
    id,
    format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
    'email',
    now(),
    now()
  FROM auth.users
  WHERE email IN ('mod1@abdstock.com', 'mod2@abdstock.com')
  ON CONFLICT DO NOTHING;

END $$;
