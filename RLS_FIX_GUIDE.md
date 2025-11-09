# Fix for RLS Error: "new row violates row-level security policy"

## Problem
When creating an account, you see this error:
```
new row violates row-level security policy for table "profiles"
```

This happens because the Row Level Security (RLS) policies are preventing the profile creation during signup.

## Solution: Database Trigger (Automatic Profile Creation)

Instead of manually creating profiles from the frontend, we'll use a database trigger that automatically creates the profile and contractor records when a user signs up.

### Steps to Fix:

#### 1. Run the Trigger Fix in Supabase

1. Go to https://supabase.com/dashboard
2. Open your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `supabase-trigger-fix.sql`
6. Paste and click **Run**

You should see:
- ✅ Function created: `handle_new_user`
- ✅ Trigger created: `on_auth_user_created`
- ✅ RLS policies updated

#### 2. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

#### 3. Test Signup Again

1. Go to http://localhost:3000/signup
2. Fill in the form
3. Click "Create Account"
4. You should now be redirected to login successfully!

---

## What the Fix Does

### Before (Manual Profile Creation):
```
User signs up → Frontend tries to insert profile → RLS blocks it ❌
```

### After (Database Trigger):
```
User signs up → Database trigger auto-creates profile → Success ✅
```

The trigger:
1. Automatically creates a `profiles` record when a user signs up
2. Automatically creates a `contractors` record if user_type is 'contractor'
3. Uses the metadata from signup form (full_name, phone, company_name)
4. Runs with SECURITY DEFINER (bypasses RLS)

---

## Verification

After applying the fix, you can verify it worked by:

1. **Check the trigger exists:**
   - Go to Supabase → Database → Triggers
   - You should see `on_auth_user_created` trigger on `auth.users` table

2. **Test signup:**
   - Create a test account
   - Should redirect to login without errors

3. **Check data was created:**
   - Go to Supabase → Table Editor → profiles
   - You should see your new user record
   - If you signed up as contractor, also check the contractors table

---

## Alternative Solution (If Trigger Doesn't Work)

If for some reason the trigger approach doesn't work, here's an alternative:

### Option 2: Disable Email Confirmation (Development Only)

1. Go to Supabase Dashboard
2. Authentication → Settings
3. Under "Email Auth", toggle OFF "Enable email confirmations"
4. Save

Then in your signup form, the session will be immediately active and RLS will work.

**Note:** Re-enable email confirmation for production!

---

## Common Issues

### Issue: "Function already exists"
**Solution:** The function was already created. Just run the trigger creation part:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Issue: Still getting RLS error
**Solutions:**
1. Make sure you ran the ENTIRE `supabase-trigger-fix.sql` file
2. Check Supabase logs for any trigger errors
3. Try the alternative solution (disable email confirmation)
4. Clear browser cache and try again

### Issue: Profile created but contractor record missing
**Solution:** Check if the user_type was correctly passed. You can manually create it:

```sql
INSERT INTO contractors (user_id, specializations, service_locations, team_size, experience_years)
SELECT id, '{}', '{}', 0, 0
FROM profiles
WHERE user_type = 'contractor'
AND id NOT IN (SELECT user_id FROM contractors);
```

---

## Why This Happened

The original RLS policy was:
```sql
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

This checks if `auth.uid()` matches the `id` being inserted. However:
- During signup, the user session isn't fully established yet
- `auth.uid()` returns NULL
- NULL ≠ user.id
- RLS blocks the insert

The trigger solution bypasses this by:
- Running with SECURITY DEFINER (admin privileges)
- Automatically creating records right after user creation
- Not relying on frontend authentication state

---

## Files Changed

- ✅ `supabase-trigger-fix.sql` - New trigger to auto-create profiles
- ✅ `components/auth/SignUpForm.jsx` - Removed manual profile creation

---

## Success!

After applying this fix:
- ✅ Users can sign up without RLS errors
- ✅ Profiles are automatically created
- ✅ Contractor records are automatically created
- ✅ No frontend code needed for profile creation
- ✅ More secure and reliable

---

## Need More Help?

If you're still having issues:
1. Check Supabase Dashboard → Logs for error details
2. Check browser console for any JavaScript errors
3. Verify the trigger exists in Supabase → Database → Triggers
4. Try creating a user directly in Supabase → Table Editor → profiles to test RLS policies

The trigger approach is the cleanest solution and is used by most production Supabase apps!
