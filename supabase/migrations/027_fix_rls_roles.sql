-- =====================================================
-- ABD STOCK - Fix RLS Roles
-- =====================================================
-- The previous is_moderator_or_higher function checked for a 'moderator' role 
-- which does not exist in our system. This updates it to allow 
-- super_admin, commerce_manager, and production_manager to manage profiles and other entities.

CREATE OR REPLACE FUNCTION is_moderator_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'commerce_manager', 'production_manager')
  );
$$;
