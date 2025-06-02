# 🕛 **SCHEDULED ROLLOVER SETUP GUIDE**

## **📋 OVERVIEW**

The task rollover system now works correctly:
- ✅ **Frontend**: NO automatic rollover - just loads existing data
- ✅ **Scheduled**: Rollover happens at 12:00 AM IST each day via Edge Function
- ✅ **Database**: All unfinished tasks are persisted to next day's assigned_tasks
- ✅ **Manual**: Debug buttons available for testing

---

## **🛠️ SETUP INSTRUCTIONS**

### **STEP 1: Database Setup (ALREADY DONE ✅)**

You've already run the `EMERGENCY_DATABASE_FIX.sql` which created:
- ✅ `daily_work_entries` table
- ✅ `user_rollover` table  
- ✅ `rollover_logs` table
- ✅ All RLS policies and permissions

### **STEP 2: Deploy Supabase Edge Function**

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Initialize Supabase in your project** (if not already done):
   ```bash
   supabase init
   ```

4. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy scheduled-rollover
   ```

### **STEP 3: Set Up Cron Job / Scheduler**

Choose one of these options to trigger the edge function at 12 AM IST daily:

#### **Option A: GitHub Actions (Recommended)**

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

#### **Option B: cPanel/Server Cron Job**

Add to your server's crontab:
```bash
# Runs at 12:00 AM IST (6:30 PM UTC) every day
30 18 * * * curl -X POST "https://your-project.supabase.co/functions/v1/scheduled-rollover" -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### **Option C: External Service (Uptime Robot, etc.)**

Set up a monitor that calls:
```
URL: https://your-project.supabase.co/functions/v1/scheduled-rollover
Method: POST
Schedule: Daily at 12:00 AM IST
```

---

## **🧪 TESTING THE SETUP**

### **Test 1: Manual Edge Function Call**

```bash
# Test the edge function directly
curl -X POST \
  "https://your-project.supabase.co/functions/v1/scheduled-rollover" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected response:
```json
{
  "message": "Not rollover time",
  "currentTime": "2024-01-15T14:30:00.000Z",
  "shouldRun": false
}
```

### **Test 2: Manual Rollover via Frontend**

1. Go to Reports page (admin view)
2. Click "🔄 Debug Rollover" button  
3. Check console for rollover logs
4. Verify tasks appear in next day

### **Test 3: Database Verification**

1. Click "🔍 Verify DB" button
2. Check console for database contents
3. Verify tasks are stored in `assigned_tasks` arrays

---

## **🔍 MONITORING & DEBUGGING**

### **Check Rollover Logs**

```sql
-- In Supabase SQL Editor
SELECT * FROM rollover_logs 
ORDER BY executed_at DESC 
LIMIT 10;
```

### **Check User Rollover Status**

```sql
-- Check last rollover date for each user
SELECT u.name, ur.last_rollover_date 
FROM users u 
LEFT JOIN user_rollover ur ON u.id = ur.user_id 
WHERE u.isActive = true;
```

### **Edge Function Logs**

1. Go to Supabase Dashboard → Edge Functions
2. Click on `scheduled-rollover` function
3. View logs tab for execution history

---

## **⚙️ CONFIGURATION**

### **Edge Function Environment Variables**

The function automatically uses:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for database access)

### **Rollover Timing**

Currently set to run between **12:00 AM - 12:05 AM IST**.

To change timing, modify in `supabase/functions/scheduled-rollover/index.ts`:
```typescript
// Change these values to adjust timing
const shouldRun = hours === 0 && minutes <= 5; // 12:00-12:05 AM
```

---

## **🚨 TROUBLESHOOTING**

### **Edge Function Not Running**

1. Check function deployment: `supabase functions list`
2. Verify environment variables in Supabase dashboard
3. Check function logs for errors

### **Cron Job Not Triggering**

1. Verify cron syntax: Use [Crontab Guru](https://crontab.guru/)
2. Check timezone: IST = UTC + 5:30
3. Test manual curl command first

### **Tasks Not Rolling Over**

1. Check `rollover_logs` table for execution history
2. Use "🔄 Debug Rollover" button to test manually
3. Verify database permissions are working

### **Database Permission Errors**

1. Re-run `EMERGENCY_DATABASE_FIX.sql`
2. Check RLS policies in Supabase dashboard
3. Verify service role has access to tables

---

## **📅 PRODUCTION SCHEDULE**

**Current Schedule:**
- ⏰ **12:00 AM IST** - Automatic rollover runs
- 📊 **12:01 AM IST** - All unfinished tasks moved to new day
- 👥 **Users access** - See rolled over tasks in daily reports

**What happens:**
1. Edge function triggers at 12 AM IST
2. Finds all active users
3. Processes rollover for each user
4. Moves unfinished tasks to current day
5. Updates `user_rollover` tracking table
6. Logs execution in `rollover_logs` table

---

## **✅ SUCCESS CRITERIA**

**System is working correctly when:**

- ✅ Edge function deploys without errors
- ✅ Cron job triggers function at 12 AM IST  
- ✅ `rollover_logs` table shows daily executions
- ✅ Unfinished tasks appear in next day automatically
- ✅ Frontend loads data without triggering rollover
- ✅ Manual debug buttons work for testing
- ✅ No 406/403 errors in browser console

**Your "5 videos skymark" task should:**
- ✅ Automatically move from June 1st to June 2nd at 12 AM IST
- ✅ Continue appearing until completed
- ✅ Be stored in database `assigned_tasks` arrays
- ✅ Show "Overdue" badge when past due date 