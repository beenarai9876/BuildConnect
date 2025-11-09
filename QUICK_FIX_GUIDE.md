# 🚀 Quick Fix Guide - Accept Bid Error

## What Was Fixed

Fixed the foreign key constraint error when accepting bids:
- **Error:** `insert or update on table "projects" violates foreign key constraint "projects_awarded_to_fkey"`
- **Root Cause:** `awarded_to` was referencing `contractors.id` but should reference `profiles.id`
- **Solution:** Updated foreign key constraint + created atomic database function

## Step 1: Run SQL Fix (2 minutes) ⚡

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select project: `oeccxntwqrlgwvretorl`

2. **Open SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run the Fix:**
   - Open file: `supabase-fix-awarded-to.sql`
   - Copy the ENTIRE file contents
   - Paste into SQL Editor
   - Click **Run** (or Ctrl/Cmd + Enter)

4. **Verify Success:**
   - Should see: "✅ Foreign key constraint fixed!"
   - Should see: "✅ Helper function accept_bid created"
   - Should see verification query results

## Step 2: Test the Fix (5 minutes) ✅

### Test Accepting a Bid:

1. **Login as Builder**
   - Go to "My Projects"
   - Click on a project that has bids

2. **View Bids Tab**
   - Should see all submitted bids
   - Should show contractor details

3. **Accept a Bid**
   - Click "Accept Bid" button
   - Click "Confirm Award" in dialog
   - Should see: "Bid accepted successfully!"
   - No errors in console

4. **Verify Changes:**
   - Accepted bid should show green border
   - Status badge should show "accepted"
   - Other bids should show "rejected"
   - Project status should change to "awarded"

### Check Console Logs:

Open browser DevTools (F12) and check console for these logs:
```
Accepting bid: [bid-id]
Project ID: [project-id]
Contractor ID: [contractor-id]
RPC Result: { success: true, ... }
Bid accepted successfully: { success: true, ... }
```

## Step 3: Complete Workflow Test (10 minutes) 🧪

### Full End-to-End Test:

1. **Create Test Project (as Builder)**
   - Title: "Test Project - Bid Acceptance"
   - Type: Residential
   - City: Any city
   - Budget: ₹1000000 - ₹2000000
   - Required specializations: Plumbing, Electrical
   - Set future dates

2. **Submit Test Bid (as Contractor)**
   - Logout and login as contractor
   - Browse projects → Find test project
   - Submit bid:
     - Price: ₹1500000
     - Duration: 60 days
     - Proposal: "Test bid for verification"

3. **Accept the Bid (as Builder)**
   - Logout and login as builder
   - View project → Bids tab
   - Accept the test bid
   - Verify success message

4. **Verify Database (Optional)**
   - In Supabase → Table Editor
   - Check `projects` table:
     - Status should be "awarded"
     - `awarded_to` should match contractor's profile ID
   - Check `bids` table:
     - Accepted bid status = "accepted"
     - Other bids status = "rejected"

## What Changed in the Code

### 1. SQL Fix (`supabase-fix-awarded-to.sql`)
- Fixed foreign key: `awarded_to` → `profiles.id`
- Created `accept_bid()` database function for atomic operations
- Added performance indexes

### 2. Updated Accept Bid Handler (`app/builder/projects/[id]/page.jsx`)
- Now uses `accept_bid()` database function via RPC
- Enhanced error logging
- Simplified error handling
- Removed manual fallback (function handles everything)

## Troubleshooting

### Issue: Function not found error
**Fix:**
- Make sure you ran the ENTIRE `supabase-fix-awarded-to.sql` file
- Check in Supabase → Database → Functions
- Should see `accept_bid` function listed

### Issue: Still getting foreign key error
**Check:**
```sql
-- Run this in Supabase SQL Editor
SELECT
  tc.constraint_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'projects'
  AND kcu.column_name = 'awarded_to';
```

**Expected Result:**
- `foreign_table_name`: profiles
- `foreign_column_name`: id

### Issue: Console shows RPC error
**Check:**
- Look at the error message in console
- Check if the bid is already accepted
- Check if project is still "open"
- Verify contractor_id exists in profiles table

## Success Criteria ✅

- [ ] SQL fix executed successfully
- [ ] No errors when clicking "Accept Bid"
- [ ] Success message appears
- [ ] Accepted bid shows green border
- [ ] Other bids show as "rejected"
- [ ] Project status changes to "awarded"
- [ ] Email notifications sent (check terminal logs)
- [ ] No errors in browser console

## Next Steps

Once this test passes:
1. Test with multiple bids on same project
2. Test edge cases (already accepted bid, closed project, etc.)
3. Verify email notifications work
4. Ready for deployment!

---

**Last Updated:** November 2024
**Status:** Ready to test after running SQL fix
