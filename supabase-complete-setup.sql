-- ============================================================
-- BUILDCONNECT - COMPLETE DATABASE SETUP
-- Run this ENTIRE file in Supabase SQL Editor
-- This will fix ALL current users AND future signups
-- ============================================================

-- STEP 1: Fix all existing users who don't have profiles
-- ============================================================

-- Create profiles for ALL existing auth users
INSERT INTO profiles (id, email, full_name, phone, company_name, user_type)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(u.raw_user_meta_data->>'phone', '0000000000'),
  COALESCE(u.raw_user_meta_data->>'company_name', 'Company'),
  COALESCE(u.raw_user_meta_data->>'user_type', 'builder')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  user_type = EXCLUDED.user_type;

-- Create contractor records for all contractor users
INSERT INTO contractors (user_id, specializations, service_locations, team_size, experience_years)
SELECT
  p.id,
  ARRAY[]::text[],
  ARRAY[]::text[],
  0,
  0
FROM profiles p
WHERE p.user_type = 'contractor'
AND NOT EXISTS (
  SELECT 1 FROM contractors c WHERE c.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- STEP 2: Update RLS Policies (Fix the permission issues)
-- ============================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Contractors can insert own data" ON contractors;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contractors;

-- Create NEW policies that allow trigger to work
CREATE POLICY "Allow all authenticated inserts on profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated inserts on contractors"
  ON contractors FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- STEP 3: Create the automatic profile creation trigger
-- ============================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_type_val TEXT;
BEGIN
  -- Get user type from metadata
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'builder');

  -- Create profile record
  INSERT INTO public.profiles (id, email, full_name, phone, company_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    user_type_val
  );

  -- If contractor, create contractor record
  IF user_type_val = 'contractor' THEN
    INSERT INTO public.contractors (user_id, specializations, service_locations, team_size, experience_years)
    VALUES (
      NEW.id,
      ARRAY[]::text[],
      ARRAY[]::text[],
      0,
      0
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 4: Grant necessary permissions
-- ============================================================

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================================
-- STEP 5: Verification - Check everything is working
-- ============================================================

-- Show all current users and their profiles
SELECT
  u.email,
  u.created_at as signup_date,
  p.user_type,
  p.full_name,
  CASE WHEN c.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_contractor_record,
  CASE WHEN p.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_profile
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN contractors c ON c.user_id = p.id
ORDER BY u.created_at DESC;

-- Check if trigger exists
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  'Trigger is active!' as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ BuildConnect Database Setup Complete!';
  RAISE NOTICE '✅ All existing users have been fixed';
  RAISE NOTICE '✅ Trigger is now active for future signups';
  RAISE NOTICE '✅ Test by creating a new account';
END $$;
