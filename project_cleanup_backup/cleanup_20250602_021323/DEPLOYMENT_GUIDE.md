# 🚀 **EDGE FUNCTION DEPLOYMENT GUIDE**

## **📋 OVERVIEW**
This guide will help you deploy the scheduled rollover edge function to your Supabase project.

---

## **STEP 1: Install Supabase CLI**

### **Option A: Using npm (try this first)**
```bash
sudo npm install -g supabase
```

### **Option B: Using Homebrew (if npm fails)**
```bash
brew install supabase/tap/supabase
```

### **Option C: Direct Download**
Visit: https://github.com/supabase/cli/releases and download for macOS

---

## **STEP 2: Login to Supabase**

```bash
supabase login
```

This will open your browser for authentication.

---

## **STEP 3: Initialize Supabase in Project**

```bash
# Run this in your project directory
supabase init
```

---

## **STEP 4: Create Edge Function Configuration**

I've already created the edge function file at:
```
supabase/functions/scheduled-rollover/index.ts
```

---

## **STEP 5: Deploy the Edge Function**

```bash
supabase functions deploy scheduled-rollover --project-ref YOUR_PROJECT_REF
```

**To find your PROJECT_REF:**
1. Go to your Supabase dashboard
2. Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
3. Copy the part after `/project/`

---

## **STEP 6: Test the Edge Function**

After deployment, test it:

```bash
curl -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-rollover" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected response when not rollover time:
```json
{
  "message": "Not rollover time",
  "currentTime": "2024-01-15T14:30:00.000Z",
  "shouldRun": false
}
```

---

## **STEP 7: Set Up GitHub Actions Cron (Recommended)**

Create `.github/workflows/scheduled-rollover.yml`:

```yaml
name: Scheduled Task Rollover
on:
  schedule:
    # Runs at 12:00 AM IST (6:30 PM UTC) every day
    - cron: '30 18 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  rollover:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Rollover
        run: |
          curl -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/scheduled-rollover" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

**Add these secrets to your GitHub repository:**
- `SUPABASE_URL`: Your full Supabase URL
- `SUPABASE_ANON_KEY`: Your anonymous/public key

---

## **STEP 8: Verify Database Tables**

Make sure you've run the `rollover_logs_table.sql` in Supabase SQL Editor:

```sql
-- This should already be done
SELECT * FROM rollover_logs LIMIT 1;
```

---

## **🧪 TESTING COMMANDS**

### **Test Manual Rollover (via Frontend)**
1. Go to Reports page (admin view)
2. Click "🔄 Debug Rollover" button
3. Check browser console for logs

### **Test Database Verification (via Frontend)**
1. Click "🔍 Verify DB" button
2. Check console for database contents

### **Test Edge Function Directly**
```bash
# Replace with your actual values
curl -X POST \
  "https://ysfknpujqivkudhnhezx.supabase.co/functions/v1/scheduled-rollover" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## **🔧 TROUBLESHOOTING**

### **CLI Installation Issues**
- Try `brew install supabase/tap/supabase` instead of npm
- Or download binary from GitHub releases

### **Authentication Issues**
- Make sure `supabase login` completed successfully
- Check you're using the correct project reference

### **Deployment Fails**
- Verify the edge function file exists at `supabase/functions/scheduled-rollover/index.ts`
- Check your internet connection
- Try `supabase functions list` to see existing functions

### **Function Not Working**
- Check edge function logs in Supabase dashboard
- Verify environment variables are set correctly
- Test with manual curl first

---

## **✅ SUCCESS CHECKLIST**

- [ ] Supabase CLI installed
- [ ] Successfully logged in to Supabase
- [ ] Edge function deployed without errors
- [ ] Manual test returns expected response
- [ ] GitHub Actions workflow created (optional)
- [ ] Database tables exist and accessible
- [ ] Manual rollover works via frontend debug buttons

---

## **📱 QUICK DEPLOYMENT (Copy-Paste)**

Once you have Supabase CLI installed:

```bash
# 1. Login (opens browser)
supabase login

# 2. Deploy the function (replace YOUR_PROJECT_REF)
supabase functions deploy scheduled-rollover --project-ref YOUR_PROJECT_REF

# 3. Test it (replace YOUR_PROJECT_REF and YOUR_ANON_KEY)
curl -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-rollover" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**That's it!** The edge function will now be available for the cron job to trigger at 12 AM IST daily. 