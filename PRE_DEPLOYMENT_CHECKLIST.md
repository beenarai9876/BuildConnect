# ✅ Pre-Deployment Checklist

Complete this checklist before deploying to Vercel.

## 🗄️ Database (Supabase)

- [x] Supabase project created
- [x] Database schema deployed (`supabase-ratings-and-enhancements.sql` run)
- [x] `accept_bid()` function created
- [x] `submit_rating()` function created
- [x] `update_contractor_ratings()` function created
- [x] `contractor_stats` view created
- [x] RLS policies enabled on all tables
- [x] Test data created (users, projects, bids)

**Verify in Supabase Dashboard:**
1. Go to Table Editor
2. Check tables exist: profiles, contractors, builders, projects, bids, ratings
3. Go to Database → Functions
4. Verify RPC functions exist

---

## 🔐 Environment Variables

Verify these exist in your `.env` file:

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `RESEND_API_KEY`
- [ ] `NEXT_PUBLIC_BASE_URL` (will update after Vercel deployment)

**Current values (from .env):**
```
NEXT_PUBLIC_SUPABASE_URL=https://oeccxntwqrlgwvretorl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUz... (starts with eyJ)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUz... (starts with eyJ)
RESEND_API_KEY=re_hGfrnERR... (starts with re_)
```

**⚠️ Important:** Copy these exact values to Vercel environment variables.

---

## 📧 Email Configuration

- [x] Resend account created
- [x] API key generated
- [x] Email routes created:
  - `app/api/emails/bid-received/route.js`
  - `app/api/emails/bid-accepted/route.js`
  - `app/api/emails/bid-rejected/route.js`
  - `app/api/emails/rating-received/route.js`

**Test after deployment:**
1. Accept a bid → Check contractor receives email
2. Submit rating → Check contractor receives email

**Note:** Free tier = 100 emails/day. For production, consider upgrading or verifying a custom domain.

---

## 🔧 Code Preparation

### Fixed Issues:
- [x] `next.config.js` - Removed `output: 'standalone'` (not needed for Vercel)
- [x] Foreign key constraints fixed (awarded_to references profiles.id)
- [x] Profile routes moved to `/profile/*` (separated from protected routes)
- [x] Middleware configured correctly
- [x] Supabase client configurations correct

### Test Locally:
```bash
# Build the project to check for errors
yarn build

# If build succeeds, you're ready to deploy
# If errors occur, fix them first
```

**Common build errors to watch for:**
- TypeScript errors (if any .ts/.tsx files)
- Missing environment variables (NEXT_PUBLIC_*)
- Import errors
- Unused variables (warnings, not critical)

---

## 📁 Git Repository

- [ ] Git initialized (`git init`)
- [ ] All files committed
- [ ] GitHub repository created
- [ ] Code pushed to GitHub

**Commands:**
```bash
cd /home/user/BuildConnect

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "feat: Complete BuildConnect platform - ready for deployment"

# Create GitHub repo, then:
git remote add origin https://github.com/YOUR_USERNAME/BuildConnect.git
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANT:** Do NOT commit `.env` file (it's gitignored, but verify):
```bash
# Check .env is ignored
git status

# Should NOT show .env as untracked
```

---

## 🚀 Vercel Setup Preparation

**Account Ready:**
- [ ] Vercel account created (https://vercel.com)
- [ ] GitHub connected to Vercel

**Domain (Optional):**
- [ ] Custom domain purchased (optional, Vercel gives free subdomain)
- [ ] DNS configured (do after deployment)

---

## 🧪 Local Testing Checklist

Test these features locally before deploying:

### Authentication:
- [ ] Sign up as builder
- [ ] Sign up as contractor
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect to login

### Builder Flow:
- [ ] Create new project
- [ ] Edit project (deadline, start date)
- [ ] View project bids
- [ ] Accept bid
- [ ] Reject bid
- [ ] Rate contractor
- [ ] View contractor profile (click name in bid)

### Contractor Flow:
- [ ] Browse projects
- [ ] Filter by location
- [ ] Submit bid
- [ ] View own profile (ratings display correctly)
- [ ] View builder profile (from project page)
- [ ] Check email notifications

### UI/UX:
- [ ] Smooth animations work
- [ ] Cards hover correctly
- [ ] Mobile responsive (test on phone or browser dev tools)
- [ ] No console errors
- [ ] Forms validate properly

**Test on localhost:3000 before deploying!**

---

## 📊 Database Verification

**Run these queries in Supabase SQL Editor:**

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- All should have rowsecurity = true

-- Check RPC functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
-- Should see: accept_bid, submit_rating, update_contractor_ratings

-- Test contractor_stats view
SELECT * FROM contractor_stats LIMIT 1;
-- Should return contractor data with ratings
```

---

## 🔍 Pre-Deployment Code Review

**Check these files one more time:**

1. **middleware.js** - Route protection configured:
   - `/builder/*` only for builders
   - `/contractor/*` only for contractors
   - `/profile/*` public (no auth required)

2. **app/builder/projects/[id]/page.jsx**:
   - Bids sorted by `quoted_price ASC`
   - Rating button appears when bid accepted
   - Contractor profile link goes to `/profile/contractor/[id]`

3. **app/contractor/dashboard/page.jsx**:
   - Location filter works
   - Shows 20 projects
   - Already bid badge appears

4. **All API routes** (`app/api/emails/*`):
   - Use `RESEND_API_KEY` from env
   - Error handling present
   - Return proper responses

5. **Supabase clients**:
   - `lib/supabase/client.js` - Uses NEXT_PUBLIC_* vars
   - `lib/supabase/server.js` - Uses cookies correctly
   - `middleware.js` - Uses @supabase/ssr correctly

---

## 📝 Deployment Environment Variables

**Copy this table - you'll need it for Vercel:**

| Variable Name | Value Source | Notes |
|---------------|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From .env | Starts with https:// |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From .env | Long JWT token |
| `SUPABASE_SERVICE_ROLE_KEY` | From .env | Long JWT token |
| `RESEND_API_KEY` | From .env | Starts with re_ |
| `NEXT_PUBLIC_BASE_URL` | TBD | Add after getting Vercel URL |
| `CORS_ORIGINS` | `*` | Or specific domain |

**After first deployment:**
1. Get Vercel URL (e.g., https://buildconnect-abc123.vercel.app)
2. Update `NEXT_PUBLIC_BASE_URL` in Vercel env vars
3. Redeploy

---

## 🎯 Post-Deployment Verification

**Immediately after deploying, test:**

1. Visit Vercel URL
2. Sign up as new builder (use different email)
3. Create a test project
4. Sign up as new contractor (different email)
5. Submit bid on project
6. Login as builder, accept the bid
7. Check: Contractor received email?
8. Rate the contractor
9. Check: Contractor received rating email?
10. Login as contractor, view profile
11. Check: Rating appears correctly?

**If all above work → Deployment successful! 🎉**

---

## 🚨 Rollback Plan

If deployment fails or has critical bugs:

**Option 1: Revert in Vercel**
1. Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click ⋯ → "Promote to Production"

**Option 2: Fix and Redeploy**
1. Fix bug locally
2. Test with `yarn build`
3. Commit and push
4. Vercel auto-deploys

**Option 3: Pause**
1. Vercel Dashboard → Project Settings
2. Temporarily take site offline
3. Fix issues
4. Redeploy

---

## 📞 Support Contacts

**If you encounter issues:**

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Resend Support:** https://resend.com/support

**Check logs:**
- Vercel: Dashboard → Deployments → Click deployment → View Logs
- Supabase: Dashboard → Logs
- Browser: F12 → Console

---

## ✅ Final Checklist

Before clicking "Deploy" on Vercel:

- [ ] All tests pass locally
- [ ] `yarn build` succeeds with no errors
- [ ] Git repo created and pushed to GitHub
- [ ] Environment variables copied and ready
- [ ] Database verified in Supabase
- [ ] Reviewed DEPLOYMENT_GUIDE.md
- [ ] Have Supabase credentials ready
- [ ] Have Resend API key ready
- [ ] Know how to rollback if needed

**Status: Ready to deploy!** 🚀

---

## 🎓 What to Expect During Deployment

1. **Initial Deploy (2-3 minutes):**
   - Vercel clones your GitHub repo
   - Installs dependencies (yarn install)
   - Builds Next.js app (next build)
   - Deploys to edge network

2. **You'll See:**
   - Build logs streaming
   - "Building..." status
   - "Deploying..." status
   - "✅ Deployment successful"

3. **You'll Get:**
   - Production URL (e.g., buildconnect-xyz.vercel.app)
   - Preview URL for each commit
   - Automatic HTTPS certificate

4. **First Visit:**
   - May take 1-2 seconds (cold start)
   - Subsequent visits: instant
   - Works globally

---

**Ready? Let's deploy!** 🎉

Follow the steps in `DEPLOYMENT_GUIDE.md` now.
