DO $$
BEGIN
  -- Update the password for the admin user to 'password123' to ensure no special characters are breaking the hash
  UPDATE auth.users
  SET encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf'))
  WHERE email = 'admin@abdstock.com';
END $$;
