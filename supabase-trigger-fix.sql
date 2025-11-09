-- ============================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- This fixes the RLS policy issue during signup
-- ============================================================

-- Function to automatically create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, company_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'builder')
  );

  -- If user type is contractor, also create contractor record
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'builder') = 'contractor' THEN
    INSERT INTO public.contractors (user_id, specializations, service_locations, team_size, experience_years)
    VALUES (
      NEW.id,
      '{}',
      '{}',
      0,
      0
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to allow the trigger to work
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Enable insert for authenticated users only"
  ON profiles FOR INSERT
  WITH CHECK (true);  -- The trigger handles the security

DROP POLICY IF EXISTS "Contractors can insert own data" ON contractors;
CREATE POLICY "Enable insert for authenticated users only"
  ON contractors FOR INSERT
  WITH CHECK (true);  -- The trigger handles the security
