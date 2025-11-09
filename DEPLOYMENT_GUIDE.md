# 🚀 BuildConnect - Vercel Deployment Guide

## How Supabase + Vercel Work Together

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                       │
│                  (Frontend Interface)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS Request
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   VERCEL (Hosting)                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Next.js App (Server + Client Components)        │ │
│  │  - Pages, Components, API Routes                 │ │
│  │  - Middleware (Auth & Route Protection)          │ │
│  │  - Server-side rendering (SSR)                   │ │
│  └───────────────────┬───────────────────────────────┘ │
└────────────────────┬─┴───────────────────────────────────┘
                     │
                     │ API Calls via @supabase/supabase-js
                     ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (Backend Platform)                │
│  ┌─────────────────┬──────────────┬──────────────────┐ │
│  │  PostgreSQL DB  │  Auth Service│  Edge Functions  │ │
│  │  - Projects     │  - User mgmt │  - API endpoints │ │
│  │  - Bids         │  - Sessions  │  - Custom logic  │ │
│  │  - Ratings      │  - RLS       │                  │ │
│  │  - Profiles     │              │                  │ │
│  └─────────────────┴──────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────┘
                     │
                     │ Webhook/API Call
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 RESEND (Email Service)                  │
│  - Sends transactional emails                           │
│  - Bid notifications, ratings, etc.                     │
└─────────────────────────────────────────────────────────┘
```

### How They Communicate

**1. Frontend to Backend (Supabase):**
- Your Next.js app uses `@supabase/supabase-js` client
- Makes direct API calls to Supabase from both:
  - **Client Components**: Browser → Supabase (for user actions)
  - **Server Components**: Vercel Server → Supabase (for SSR)
  - **API Routes**: Vercel Serverless Functions → Supabase

**2. Authentication Flow:**
```javascript
// User logs in (browser)
const { data, error } = await supabase.auth.signInWithPassword({...})
↓
// Supabase validates credentials
Supabase Auth Service checks user
↓
// Session stored in cookies
Next.js middleware reads session from cookies
↓
// Protected routes accessible
User can access /builder/* or /contractor/*
```

**3. Database Operations:**
```javascript
// Any component/API route
const { data } = await supabase.from('projects').select('*')
↓
// Sent over HTTPS to Supabase
Your app → https://oeccxntwqrlgwvretorl.supabase.co/rest/v1/projects
↓
// Supabase checks RLS policies
Is user authenticated? Does RLS allow this query?
↓
// Returns data
PostgreSQL → Supabase → Your App
```

**Key Benefits:**
✅ **No backend code needed** - Supabase handles all database operations
✅ **Serverless** - Vercel scales automatically
✅ **Secure** - RLS policies enforce data access rules
✅ **Fast** - Edge network for both platforms
✅ **Easy** - Just environment variables to connect them

---

## Prerequisites

Before deploying, ensure you have:

- [x] Supabase project created (already done ✓)
- [x] Database schema deployed (ratings, projects, bids, etc.) ✓
- [x] RLS policies enabled ✓
- [ ] GitHub repository with your code
- [ ] Vercel account (free tier is fine)
- [ ] Domain name (optional, Vercel provides free subdomain)

---

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

**1.1 Initialize Git (if not already done):**
```bash
cd /home/user/BuildConnect
git init
git add .
git commit -m "Initial commit - BuildConnect platform ready for deployment"
```

**1.2 Create GitHub Repository:**
1. Go to https://github.com/new
2. Name: `BuildConnect`
3. Description: "Construction bidding marketplace connecting builders with contractors"
4. Privacy: Choose Public or Private
5. Click "Create repository"

**1.3 Push to GitHub:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/BuildConnect.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy to Vercel

**2.1 Sign Up / Log In:**
1. Go to https://vercel.com
2. Click "Sign Up" (use GitHub account for easy integration)
3. Authorize Vercel to access your GitHub

**2.2 Import Project:**
1. Click "Add New..." → "Project"
2. Select "Import Git Repository"
3. Find your `BuildConnect` repository
4. Click "Import"

**2.3 Configure Project:**

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `./` (default)

**Build Settings:**
- Build Command: `next build` (default)
- Output Directory: `.next` (default)
- Install Command: `yarn install` (default, since you use yarn)

**Environment Variables** - Click "Add" for each:

| Name | Value | Where to Find |
|------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oeccxntwqrlgwvretorl.supabase.co` | Your .env file |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your .env file (the long key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your .env file (service role key) |
| `RESEND_API_KEY` | `re_hGfrnERR_8b1Ng4EuEk87nL7x4x53uWt8` | Your .env file |
| `NEXT_PUBLIC_BASE_URL` | `https://buildconnect.vercel.app` | Will be your Vercel URL (update after deployment) |

**2.4 Deploy:**
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. ✅ Deployment successful!

---

### Step 3: Update Supabase Settings

**3.1 Add Vercel URL to Allowed Origins:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (`oeccxntwqrlgwvretorl`)
3. Go to **Authentication** → **URL Configuration**
4. Add to **Site URL**: `https://your-project.vercel.app`
5. Add to **Redirect URLs**:
   - `https://your-project.vercel.app/**`
   - `https://your-project.vercel.app/auth/callback`

**3.2 Update CORS (if needed):**
1. Go to **Project Settings** → **API**
2. Under **CORS Settings**, ensure your Vercel domain is allowed

---

### Step 4: Update Environment Variable

**4.1 Get Your Vercel URL:**
After deployment, Vercel gives you a URL like: `https://build-connect-xyz.vercel.app`

**4.2 Update NEXT_PUBLIC_BASE_URL:**
1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `NEXT_PUBLIC_BASE_URL`
3. Edit value to: `https://your-actual-vercel-url.vercel.app`
4. Save
5. Redeploy: Go to "Deployments" → Click ⋯ on latest → "Redeploy"

---

### Step 5: Test Your Deployment

**5.1 Check Homepage:**
Visit `https://your-project.vercel.app`
- ✅ Page loads correctly
- ✅ No console errors

**5.2 Test Authentication:**
1. Click "Sign Up"
2. Create builder account
3. ✅ Redirects to builder dashboard
4. Log out
5. Create contractor account
6. ✅ Redirects to contractor dashboard

**5.3 Test Core Features:**
- **Builder:**
  - ✅ Create new project
  - ✅ View bids
  - ✅ Accept bid
  - ✅ Rate contractor
  - ✅ Receive email notifications

- **Contractor:**
  - ✅ Browse projects
  - ✅ Filter by location
  - ✅ Submit bid
  - ✅ View own profile
  - ✅ Receive email notifications

**5.4 Check Database:**
1. Go to Supabase → Table Editor
2. Verify new data appears when you create projects/bids
3. ✅ Data syncing correctly

---

## Common Issues & Solutions

### Issue 1: "Failed to fetch" or API errors

**Cause:** Environment variables not set correctly

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Verify all 5 variables are present
3. Check for typos in keys
4. Redeploy after changes

---

### Issue 2: Redirect loops or auth errors

**Cause:** Supabase URL configuration

**Fix:**
1. Supabase → Authentication → URL Configuration
2. Add Vercel URL to allowed redirects
3. Clear browser cookies
4. Try again

---

### Issue 3: Email notifications not sending

**Cause:** Resend API key issue or sender domain

**Fix:**
1. Check `RESEND_API_KEY` in Vercel env vars
2. In Resend dashboard, verify domain is verified
3. For production, add custom domain to Resend
4. Update email sender in `app/api/emails/*` routes

---

### Issue 4: Middleware not protecting routes

**Cause:** Middleware not running on all routes

**Fix:**
Check `middleware.js` - matcher should be:
```javascript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|public|api).*)',
  ],
}
```

---

### Issue 5: Build fails on Vercel

**Possible Causes & Fixes:**

**TypeScript errors:**
```bash
# In your project
yarn build
# Fix any errors shown
git commit -am "Fix build errors"
git push
```

**Missing dependencies:**
```bash
# Check package.json has all deps
yarn install
git add package.json yarn.lock
git commit -m "Update dependencies"
git push
```

**Environment variables during build:**
- Ensure `NEXT_PUBLIC_*` variables are set in Vercel
- These are needed at build time, not just runtime

---

## Performance Optimizations

### 1. Enable ISR (Incremental Static Regeneration)

For public pages like contractor profiles:

```javascript
// app/profile/contractor/[id]/page.jsx
export const revalidate = 3600 // Revalidate every hour
```

### 2. Add Edge Runtime for API Routes

```javascript
// app/api/emails/*/route.js
export const runtime = 'edge' // Faster cold starts
```

### 3. Enable Caching

In Supabase client setup:
```javascript
// lib/supabase/client.js
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )
}
```

---

## Monitoring & Analytics

### 1. Vercel Analytics
1. In Vercel Dashboard → Your Project
2. Go to "Analytics" tab
3. Enable "Web Analytics" (free)
4. Track page views, performance, etc.

### 2. Supabase Monitoring
1. Supabase Dashboard → Reports
2. Monitor:
   - Database queries
   - API usage
   - Active users
   - Storage usage

### 3. Error Tracking
Consider adding Sentry:
```bash
yarn add @sentry/nextjs
```

---

## Custom Domain (Optional)

### Add Your Own Domain

**1. Purchase Domain:**
- Namecheap, GoDaddy, Google Domains, etc.

**2. Add to Vercel:**
1. Vercel → Project → Settings → Domains
2. Enter your domain: `buildconnect.com`
3. Add DNS records (Vercel shows you exactly what to add)

**3. Update Environment Variables:**
- Change `NEXT_PUBLIC_BASE_URL` to `https://buildconnect.com`
- Update Supabase allowed URLs

**4. SSL Certificate:**
- Vercel auto-provisions SSL (free)
- Wait 24-48 hours for DNS propagation

---

## Continuous Deployment

**Automatic Deployments:**
- Every `git push` to `main` branch → auto-deploys to production
- Pull requests → get preview deployments
- Branches → can be configured for staging

**Preview Deployments:**
1. Create new branch: `git checkout -b feature/new-feature`
2. Make changes
3. Push: `git push origin feature/new-feature`
4. Create PR on GitHub
5. Vercel auto-creates preview URL
6. Test on preview before merging

---

## Scaling Considerations

### When You Grow:

**Supabase Free Tier Limits:**
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users

**Upgrade to Pro ($25/month) when:**
- Database > 500 MB
- Need custom domain for emails
- Want daily backups
- Need more bandwidth

**Vercel Free Tier:**
- 100 GB bandwidth/month
- Unlimited deployments
- Automatic SSL

**Upgrade to Pro ($20/month) when:**
- Need more bandwidth
- Want advanced analytics
- Need team collaboration

---

## Security Checklist

Before going live:

- [x] RLS policies enabled on all tables ✓
- [x] Service role key only in server-side code ✓
- [x] Anon key safe to expose (read-only) ✓
- [ ] HTTPS only (Vercel default)
- [ ] Auth session timeout configured
- [ ] Rate limiting on API routes (add if needed)
- [ ] Input validation on all forms
- [ ] SQL injection protected (Supabase handles this)
- [ ] XSS protected (React handles this)
- [ ] CORS configured correctly

---

## Backup Strategy

### Database Backups

**Automatic (Supabase Pro):**
- Daily backups
- Point-in-time recovery

**Manual (Free Tier):**
```bash
# Export database
pg_dump -h db.oeccxntwqrlgwvretorl.supabase.co \
  -U postgres \
  -d postgres > backup.sql
```

**Vercel:**
- Code is in GitHub (backed up)
- Environment variables: Export from Settings

---

## Post-Deployment Tasks

### 1. Test Everything
- [ ] Sign up as builder
- [ ] Create project
- [ ] Sign up as contractor
- [ ] Submit bid
- [ ] Accept bid (as builder)
- [ ] Rate contractor
- [ ] Check email notifications
- [ ] Test on mobile
- [ ] Test all filters

### 2. Update Documentation
- [ ] Add production URL to README
- [ ] Update NEW_FEATURES_GUIDE.md with deployment info
- [ ] Document any custom setup

### 3. Share with Users
- [ ] Announce launch
- [ ] Create user guide
- [ ] Set up support email

---

## Cost Breakdown (Free Tier)

| Service | Free Tier | Cost if Exceeded |
|---------|-----------|------------------|
| **Vercel** | 100 GB bandwidth | $20/month Pro |
| **Supabase** | 500 MB DB, 50K MAU | $25/month Pro |
| **Resend** | 100 emails/day | $20/month (3K emails) |
| **Domain** | N/A | $10-15/year |
| **Total** | **$0/month** | ~$65/month at scale |

---

## Next Steps After Deployment

1. **Monitor for 24-48 hours**
   - Check error logs
   - Monitor performance
   - Fix any issues

2. **Gather Feedback**
   - Share with beta users
   - Collect bug reports
   - Note feature requests

3. **Optimize**
   - Add caching where needed
   - Optimize slow queries
   - Compress images

4. **Market**
   - Create landing page content
   - Add SEO metadata
   - Share on social media

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Discord:** https://vercel.com/discord
- **Supabase Discord:** https://discord.supabase.com

---

## Troubleshooting Commands

```bash
# Check Vercel deployment logs
vercel logs [deployment-url]

# Run build locally to test
yarn build

# Clear Next.js cache
rm -rf .next

# Check for TypeScript errors
npx tsc --noEmit

# Test production build locally
yarn build && yarn start
```

---

## Success Checklist

Your deployment is successful when:

- ✅ Site loads at Vercel URL
- ✅ Can create accounts (builder & contractor)
- ✅ Can create projects
- ✅ Can submit bids
- ✅ Can accept bids
- ✅ Ratings work
- ✅ Emails send correctly
- ✅ Location filter works
- ✅ Public profiles load
- ✅ Mobile responsive
- ✅ No console errors

---

## Summary

**What happens when you deploy:**

1. **Code Push:** You push code to GitHub
2. **Vercel Detects:** Webhook triggers build
3. **Build:** Next.js app is built on Vercel servers
4. **Deploy:** App deployed to edge network globally
5. **Live:** Users access via Vercel URL
6. **Requests:** App makes API calls to Supabase
7. **Data:** Supabase returns data via RLS-protected queries
8. **Emails:** Resend sends transactional emails

**The beauty of this stack:**
- 🚀 **Deploy in minutes** - No server setup
- 💰 **$0 to start** - Free tiers for everything
- 📈 **Scales automatically** - Handle 1 or 10,000 users
- 🔒 **Secure by default** - HTTPS, RLS, Auth built-in
- 🌍 **Global edge network** - Fast for users everywhere

---

Ready to deploy? Let's do this! 🎉
