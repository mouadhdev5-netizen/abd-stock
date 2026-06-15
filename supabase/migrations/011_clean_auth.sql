DO $$
BEGIN
  -- Delete from identities first to avoid any potential FK issues (though auth.users usually cascades)
  DELETE FROM auth.identities 
  WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('admin@abdstock.com', 'mod1@abdstock.com', 'mod2@abdstock.com'));

  -- Delete from auth.users (this will cascade to public.profiles)
  DELETE FROM auth.users 
  WHERE email IN ('admin@abdstock.com', 'mod1@abdstock.com', 'mod2@abdstock.com');
END $$;
