# 🧪 **DATABASE PERSISTENCE TEST GUIDE**

## **STEP 1: Fix Database First (CRITICAL!)**

**Before testing, run the database fix:**
1. Go to Supabase SQL Editor
2. Copy and run entire `EMERGENCY_DATABASE_FIX.sql`
3. Verify no 406/403 errors in console

---

## **STEP 2: Test Database Persistence**

### **🔍 Manual Database Verification**

1. **Open Reports Page** → Admin view
2. **Click "🔍 Verify DB" button**
3. **Check console logs** for database contents:

```
🔍 Starting manual database verification...
📅 2024-01-15: {
  success: true,
  assignedTasks: ["task-1", "task-2"],
  completedTasks: ["task-3"],
  taskCount: 2
}
```

### **🔄 Test Rollover Persistence**

1. **Create a test task** in TaskBoard due yesterday
2. **Click "🔄 Debug Rollover" button** 
3. **Watch console logs** for database updates:

```
🔄 Processing rollover: 2024-01-14 → 2024-01-15 for user xxx
📋 Found 1 unfinished tasks on 2024-01-14: ["task-id"]
💾 Database updated for 2024-01-15: {
  userId: "xxx",
  date: "2024-01-15", 
  assignedTasks: ["task-id"],
  taskCount: 1
}
✅ DATABASE VERIFICATION PASSED: 1 tasks successfully rolled over
```

---

## **STEP 3: Verify Supabase Database Directly**

### **Check Tables in Supabase Dashboard:**

1. **Go to Supabase Dashboard** → Table Editor
2. **Check `daily_work_entries` table:**

| user_id | date | assigned_tasks | completed_tasks |
|---------|------|----------------|-----------------|
| user123 | 2024-01-15 | ["task-1","task-2"] | ["task-3"] |

3. **Check `user_rollover` table:**

| user_id | last_rollover_date |
|---------|-------------------|
| user123 | 2024-01-15 |

---

## **STEP 4: End-to-End Test**

### **🎯 Test Scenario: Past Deadline Task Rollover**

1. **Create task in TaskBoard:**
   - Title: "Test Rollover Task"
   - Assigned to: althameem
   - Due date: June 1st, 2024
   - Status: In Progress (not completed)

2. **Trigger rollover manually:**
   - Go to Reports page
   - Click "🔄 Debug Rollover"
   - Navigate to June 2nd

3. **Expected Results:**
   - **June 1st:** Shows task with "Rolled Over" badge
   - **June 2nd:** Shows task with "Overdue (Due Jun 1)" badge
   - **Database:** Contains task ID in assigned_tasks for June 2nd

4. **Verify database persistence:**
   - Click "🔍 Verify DB"
   - Check console for June 2nd entry
   - Should show task in assignedTasks array

---

## **STEP 5: Console Log Verification**

### **✅ Success Indicators:**

```
✅ DATABASE VERIFICATION PASSED: X tasks successfully rolled over
💾 Database updated for [date]: { assignedTasks: [...], taskCount: X }
🎉 Comprehensive rollover completed for user [id]
```

### **❌ Failure Indicators:**

```
❌ DATABASE VERIFICATION FAILED: Expected X tasks, found Y
❌ Error processing rollover from [date] to [date]
406/403 errors in network tab
```

---

## **STEP 6: Production Verification**

### **Real-world Test with Your Skymark Task:**

1. **Verify the task exists:**
   ```javascript
   // In browser console:
   const skymarkTask = tasks.find(t => t.title.includes('skymark'));
   console.log('Skymark task:', skymarkTask);
   ```

2. **Check database for June 1st:**
   ```javascript
   // Should show task in assigned_tasks if it was assigned
   // Click "🔍 Verify DB" and look for 2024-06-01 entry
   ```

3. **Trigger rollover and verify June 2nd:**
   ```javascript
   // After clicking "🔄 Debug Rollover"
   // Check database for 2024-06-02 entry
   // Should contain the skymark task ID
   ```

---

## **🚀 EXPECTED DATABASE FLOW**

### **Before Rollover (June 1st):**
```sql
-- daily_work_entries table
user_id: althameem-id
date: '2024-06-01'
assigned_tasks: ['skymark-task-id']
completed_tasks: []
```

### **After Rollover (June 2nd):**
```sql
-- daily_work_entries table  
user_id: althameem-id
date: '2024-06-02'
assigned_tasks: ['skymark-task-id']  ← PERSISTED IN DATABASE
completed_tasks: []
```

### **After Rollover (June 3rd and beyond):**
```sql
-- daily_work_entries table
user_id: althameem-id  
date: '2024-06-03'
assigned_tasks: ['skymark-task-id']  ← CONTINUES ROLLING OVER
completed_tasks: []
```

---

## **🔧 TROUBLESHOOTING**

### **If Database Verification Fails:**

1. **Check Supabase permissions:**
   - Ensure tables exist
   - Verify RLS policies allow access

2. **Check rollover logic:**
   - Look for errors in rollover processing
   - Verify updateDailyWorkEntry is called

3. **Manual database check:**
   - Go to Supabase → SQL Editor
   - Run: `SELECT * FROM daily_work_entries WHERE user_id = 'user-id' ORDER BY date DESC;`

### **If Tasks Don't Roll Over:**

1. **Verify task assignment:**
   - Task must be in assigned_tasks array for previous day
   - Task must NOT be in completed_tasks array

2. **Check rollover trigger:**
   - Ensure processComprehensiveRollover is called
   - Verify no errors in rollover processing

3. **Database constraints:**
   - Check for unique constraint violations
   - Verify foreign key references exist

---

## **✅ SUCCESS CRITERIA**

**The system is working correctly when:**

- ✅ Database verification shows tasks in assigned_tasks arrays
- ✅ Rollover logs confirm database updates
- ✅ Past deadline tasks appear in subsequent days
- ✅ Tasks persist in database across sessions
- ✅ No 406/403 errors in console
- ✅ Manual rollover triggers work properly

**The "5 videos skymark" task should:**
- ✅ Appear in database for June 1st (assigned_tasks)
- ✅ Roll over to June 2nd (assigned_tasks) 
- ✅ Continue appearing until completed
- ✅ Show "Overdue" badge in UI
- ✅ Be modifiable only on current day 