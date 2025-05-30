# FIX AUTHENTICATION ISSUE

## Problem Identified
Your Supabase anon key is **invalid/incomplete**, which prevents any connection to Supabase.

## IMMEDIATE SOLUTION

### Step 1: Get Correct API Keys

1. Go to: https://supabase.com/dashboard/project/ysfknpujqivkudhnhezx/settings/api

2. Copy the **anon public** key (should be ~400+ characters long)

3. Copy the **service_role** key (for later migration)

### Step 2: Update Environment Files

Update both `.env` and `.env.local` with the correct keys:

```bash
VITE_SUPABASE_URL=https://ysfknpujqivkudhnhezx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmtucHVqcWl2a3VkaG5oZXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTYxMTMsImV4cCI6MjA2MzE3MjExM30.zSHRvncRmwEMNTPgfIgieN6A4tZ2VeCfu6u

# For migration (get from dashboard)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Update vercel.json

Update the `vercel.json` file with the correct complete key:

```json
{
  "env": {
    "VITE_SUPABASE_URL": "https://ysfknpujqivkudhnhezx.supabase.co",
    "VITE_SUPABASE_ANON_KEY": "PASTE_COMPLETE_KEY_HERE"
  }
}
```

### Step 4: Test Connection

```bash
node auth_test.mjs
```

If successful, you should see users listed.

## COMPLETE SOLUTION (After API Keys Work)

### Option A: Quick Fix (Custom Auth)
1. Run the SQL script in Supabase:
   ```sql
   -- Copy content from fix_user_authentication.sql
   ```

### Option B: Proper Fix (Migrate to Supabase Auth)
1. Set `SUPABASE_SERVICE_ROLE_KEY` in .env
2. Run migration:
   ```bash
   node migrate_users_to_auth.js --dry-run
   node migrate_users_to_auth.js
   ```

## Why This Happened

Your current anon key appears to be truncated:
- **Current:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...` (incomplete)
- **Should be:** ~400+ characters ending with proper signature

JWT tokens have 3 parts separated by dots (header.payload.signature). Your current key is missing the complete signature portion.

## Test Commands

After fixing the keys:

```bash
# Test connection
node auth_test.mjs

# Test SQL fix
# (Copy fix_user_authentication.sql to Supabase SQL editor)

# Full migration (optional)
node migrate_users_to_auth.js --dry-run
```

## Expected Results After Fix

1. ✅ App can connect to Supabase
2. ✅ Custom authentication works for all users
3. ✅ Admin login works
4. ✅ Other users can sign in with their passwords
5. ✅ (Optional) All users migrated to proper Supabase Auth 