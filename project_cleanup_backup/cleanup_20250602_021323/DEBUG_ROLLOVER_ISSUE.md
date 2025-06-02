# 🔍 **DEBUGGING ROLLOVER ISSUE: "5 videos skymark" Task**

## **IMMEDIATE FIXES APPLIED**

### **1. Database Permission Fix**
- **Problem**: 406/403 errors preventing rollover system from working
- **Solution**: Run `EMERGENCY_DATABASE_FIX.sql` in Supabase SQL Editor
- **Result**: Creates missing tables and fixes permissions

### **2. Past-Deadline Task Logic Fix**
- **Problem**: Tasks past their due date weren't rolling over to subsequent days
- **Solution**: Updated frontend logic to include past-deadline unfinished tasks
- **Result**: Tasks due June 1st will now appear in June 2nd, 3rd, etc. until completed

---

## **🧪 DEBUGGING STEPS**

### **Step 1: Fix Database Issues (CRITICAL!)**
```sql
-- RUN THIS IN SUPABASE SQL EDITOR FIRST!
-- Copy contents of EMERGENCY_DATABASE_FIX.sql and run it
```

### **Step 2: Check Console Logs**
1. Open browser Developer Tools → Console
2. Navigate to Reports page
3. Look for these specific log messages:

```
🔄 Loading data for [user] on [date] with rollover...
📊 Report loaded for [user] on [date]:
📋 Final report for [user] on [date]:
  - totalAssignedTasks: X
  - tasksFromRollover: X  
  - tasksFromDueToday: X
  - tasksFromPastDeadline: X ← THIS IS THE KEY ONE!
```

### **Step 3: Manual Rollover Test**
1. In Reports page, click the **"🔄 Debug Rollover"** button (admin only)
2. Watch console for rollover processing messages
3. Navigate to June 2nd after rollover completes

### **Step 4: Check Specific Task Data**
Use browser console to inspect the task:

```javascript
// In browser console on Reports page:
console.log('All tasks for user:', tasks.filter(t => t.assigneeId === 'althameem-user-id'));
console.log('Tasks due June 1:', tasks.filter(t => t.dueDate === '2024-06-01'));
console.log('Skymark task:', tasks.find(t => t.title.includes('skymark')));
```

---

## **🎯 SPECIFIC INVESTIGATION FOR YOUR CASE**

### **Possible Causes Why "5 videos skymark" Isn't Showing:**

#### **A. Task Completion Status**
- **Check**: Is the task marked as completed on June 1st?
- **Solution**: If accidentally completed, move it back to assigned

#### **B. Week Navigation Issue**
- **Check**: Are you viewing a week that includes June 2nd?
- **Solution**: Navigate to the week containing June 2nd-8th

#### **C. Database Permissions (MOST LIKELY)**
- **Check**: Console shows 406/403 errors
- **Solution**: Run the emergency database fix script

#### **D. Rollover Not Triggered**
- **Check**: System didn't process rollover automatically
- **Solution**: Use "🔄 Debug Rollover" button

---

## **📊 EXPECTED BEHAVIOR AFTER FIXES**

### **June 1st (Past Date)**
- Shows "5 videos skymark" with **"Rolled Over"** badge
- Task appears in gray styling (read-only)
- Cannot be modified

### **June 2nd and Beyond**
- Shows "5 videos skymark" in **"Tasks Assigned"** section
- Task appears with **red "Overdue"** badge
- Can be completed normally
- Due date shows "Due: Jun 1" (original due date)

---

## **🚀 VERIFICATION CHECKLIST**

- [ ] Run `EMERGENCY_DATABASE_FIX.sql` in Supabase
- [ ] Refresh the Reports page
- [ ] No 406/403 errors in console
- [ ] Click "🔄 Debug Rollover" button
- [ ] Navigate to June 2nd week
- [ ] Expand June 2nd day
- [ ] Task appears in "Tasks Assigned" with "Overdue" badge

---

## **📞 IF STILL NOT WORKING**

### **Additional Debug Info to Collect:**

1. **Task Details:**
```javascript
// Run in browser console:
const skymarkTask = tasks.find(t => t.title.includes('skymark'));
console.log('Skymark task details:', skymarkTask);
```

2. **User ID:**
```javascript
// Get althameem's user ID:
const user = users.find(u => u.name.includes('althameem'));
console.log('User details:', user);
```

3. **Daily Reports:**
```javascript
// Check June 1st and 2nd reports:
console.log('June 1st report:', dailyReports['user-id-2024-06-01']);
console.log('June 2nd report:', dailyReports['user-id-2024-06-02']);
```

### **Manual Verification:**
- Check Supabase dashboard → daily_work_entries table
- Look for entries with user_id = althameem's ID and date = 2024-06-01
- Verify the task ID is in the assigned_tasks array

---

## **🔄 ROLLOVER SYSTEM SUMMARY**

**How It Works:**
1. **12 AM IST**: System processes rollover automatically
2. **Past Deadline Tasks**: Continue rolling over until completed
3. **Idempotent**: Safe to run multiple times
4. **Manual Trigger**: "🔄 Debug Rollover" button for testing

**Key Features:**
- ✅ Past deadline tasks roll over indefinitely until completed
- ✅ Visual indicators: "Overdue" badges, red styling
- ✅ Read-only past dates with "Rolled Over" badges
- ✅ Comprehensive logging for debugging 