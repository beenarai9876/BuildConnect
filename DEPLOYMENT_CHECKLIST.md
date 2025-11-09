# 🚀 BuildConnect - Deployment Checklist

## ⚠️ CRITICAL: Run This First!

### Step 1: Fix Database Setup (5 minutes)

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select project: `oeccxntwqrlgwvretorl`

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run Complete Setup**
   - Open file: `supabase-complete-setup.sql`
   - Copy **ENTIRE** file contents
   - Paste into SQL Editor
   - Click **Run** (or Ctrl/Cmd + Enter)

4. **Verify Success**
   - You should see a table showing all users with their profiles
   - Should see: "✅ BuildConnect Database Setup Complete!"
   - Should see: "✅ Trigger is now active for future signups"

---

## ✅ Verification Steps

### Test 1: Check Existing Users (2 minutes)

Run this SQL to see all users are fixed:

```sql
SELECT
  u.email,
  p.user_type,
  CASE WHEN p.id IS NOT NULL THEN '✅' ELSE '❌' END as has_profile,
  CASE WHEN c.id IS NOT NULL THEN '✅' ELSE '❌' END as has_contractor
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN contractors c ON c.user_id = p.id;
```

**Expected:** All users should have ✅ for `has_profile`. Contractors should have ✅ for `has_contractor`.

### Test 2: Check Trigger is Active (1 minute)

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Expected:** Should return 1 row. If empty, trigger didn't install!

### Test 3: Test New Signup (3 minutes)

**IMPORTANT: Use a NEW email you haven't used before!**

1. **Logout from your app**
2. **Go to**: http://localhost:3000/signup
3. **Sign up as CONTRACTOR** with new email:
   - Email: `test-contractor@example.com`
   - Password: `password123`
   - User type: **Contractor**
   - Fill other fields

4. **Check Database Immediately**:
   ```sql
   -- Run this right after signup
   SELECT
     email,
     (SELECT user_type FROM profiles WHERE id = auth.users.id) as user_type,
     (SELECT COUNT(*) FROM contractors WHERE user_id = auth.users.id) as contractor_count
   FROM auth.users
   WHERE email = 'test-contractor@example.com';
   ```

   **Expected:**
   - `user_type`: 'contractor'
   - `contractor_count`: 1

5. **Login and Test Bidding**:
   - Login with the test contractor account
   - Browse projects
   - Try to submit a bid
   - **Should work without errors!**

---

## 🧪 Complete Workflow Test (10 minutes)

### Test Builder Flow:

1. **Login as Builder**
2. **Post a Project**:
   - Title: "Test Project for Deployment"
   - Type: Residential
   - City: Patna
   - Budget: ₹1000000 - ₹2000000
   - Required: Plumbing, Electrical
   - Any future dates
3. **Verify project appears** in "My Projects"

### Test Contractor Flow:

1. **Login as Contractor** (use the test account from above)
2. **Complete Profile**:
   - Add specializations
   - Add service locations
   - Add experience
   - Save
3. **Browse Projects**
4. **Submit a Bid** on the test project:
   - Price: ₹1500000
   - Duration: 60 days
   - Proposal: "Test bid for verification"
5. **Check "My Bids"** - should show as Pending

### Test Bid Acceptance:

1. **Login as Builder**
2. **View the project** with bids
3. **Accept the bid**
4. **Check emails** - both builder and contractor should receive emails

**If ALL these work → ✅ Ready for deployment!**

---

## 🔧 Troubleshooting

### Issue: Trigger not working

**Check:**
```sql
-- Is trigger enabled?
SELECT tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Fix if not enabled:**
```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

### Issue: Still getting foreign key errors

**Run this to fix current user:**
```sql
-- Replace with actual email
INSERT INTO profiles (id, email, full_name, phone, company_name, user_type)
SELECT id, email, email, '0000000000', 'Company',
  COALESCE(raw_user_meta_data->>'user_type', 'builder')
FROM auth.users
WHERE email = 'YOUR_EMAIL'
ON CONFLICT (id) DO NOTHING;

-- If contractor
INSERT INTO contractors (user_id, specializations, service_locations, team_size, experience_years)
SELECT id, '{}', '{}', 0, 0
FROM auth.users
WHERE email = 'YOUR_EMAIL'
  AND (raw_user_meta_data->>'user_type') = 'contractor'
ON CONFLICT (user_id) DO NOTHING;
```

### Issue: Emails not sending

**Check Resend Dashboard:**
- https://resend.com/emails
- Look for logs
- Check if API key is correct in `.env`

**Test email API:**
```bash
# In terminal
curl -X POST http://localhost:3000/api/emails/test
```

---

## 📋 Pre-Deployment Checklist

### Database:
- [ ] `supabase-complete-setup.sql` executed successfully
- [ ] All existing users have profiles
- [ ] Trigger is active and working
- [ ] Test signup creates profile automatically
- [ ] No foreign key errors

### Application:
- [ ] `npm install` completed
- [ ] `npm run dev` starts without errors
- [ ] Login works for both roles
- [ ] Post project works
- [ ] Submit bid works
- [ ] Accept bid works
- [ ] Email notifications work

### Environment:
- [ ] `.env` has all required variables
- [ ] Supabase URL is correct
- [ ] Supabase keys are correct
- [ ] Resend API key is correct

### Testing:
- [ ] Complete workflow test passed
- [ ] No errors in browser console
- [ ] No errors in terminal
- [ ] Mobile responsive checked
- [ ] All role redirects work

---

## 🌐 Deployment to Vercel

Once ALL tests pass:

1. **Commit Latest Changes**:
   ```bash
   git add -A
   git commit -m "fix: Complete database setup for production"
   git push origin claude/platform-setup-initial-011CUwB86qzb8iGgCm3ZCEJJ
   ```

2. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Import your GitHub repo
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `RESEND_API_KEY`
   - Deploy!

3. **Update Supabase Settings** (IMPORTANT):
   - Supabase → Authentication → URL Configuration
   - Add your Vercel URL to allowed redirect URLs
   - Format: `https://your-app.vercel.app/**`

4. **Test Production**:
   - Sign up new user on production
   - Test complete workflow
   - Check emails

---

## 🎯 Success Criteria

✅ **Database Setup Complete:**
- Trigger active
- All users have profiles
- No manual SQL needed for new users

✅ **Application Works:**
- Signup → Login → Post Project → Bid → Accept
- No errors at any step
- Emails sent successfully

✅ **Production Ready:**
- Deployed to Vercel
- Environment variables configured
- Supabase redirect URLs updated
- Test user can complete full workflow

---

## 📞 Emergency Fixes

### If signup fails in production:

```sql
-- Quick fix to create profile manually (last resort)
INSERT INTO profiles (id, email, full_name, phone, company_name, user_type)
SELECT id, email,
  COALESCE(raw_user_meta_data->>'full_name', 'User'),
  COALESCE(raw_user_meta_data->>'phone', '0000000000'),
  COALESCE(raw_user_meta_data->>'company_name', 'Company'),
  COALESCE(raw_user_meta_data->>'user_type', 'builder')
FROM auth.users
WHERE email = 'FAILED_USER_EMAIL'
ON CONFLICT DO NOTHING;
```

### If trigger stops working:

```sql
-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 🎉 Final Check

Before going live, verify:

1. [ ] Can create new account (builder)
2. [ ] Can create new account (contractor)
3. [ ] Builder can post project
4. [ ] Contractor can bid
5. [ ] Builder can accept bid
6. [ ] Emails work
7. [ ] No console errors
8. [ ] Mobile works
9. [ ] All data appears in Supabase tables
10. [ ] Ready to show to users!

---

**Last Updated:** November 2024
**Status:** Ready for deployment after running complete setup SQL
