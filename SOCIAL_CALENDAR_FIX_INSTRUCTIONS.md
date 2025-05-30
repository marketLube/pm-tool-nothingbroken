# 🔧 Social Calendar Fix Instructions

## ❌ **Current Issues You're Experiencing:**

1. **404 Errors**: `social_calendar_tasks` table doesn't exist in Supabase
2. **Task Creation Fails**: "Failed to create task, try again" 
3. **refreshClients Error**: "refreshClients is not a function"
4. **Import Error**: Cannot find SimpleSocialTaskModal component

## ✅ **Step-by-Step Solutions:**

### **STEP 1: Create Database Table** 
This is the **most critical step** - the 404 errors indicate the table doesn't exist.

1. **Open Supabase Dashboard**:
   - Go to: https://ysfknpujqivkudhnhezx.supabase.co
   - Navigate to **SQL Editor**

2. **Copy & Run SQL Script**:
   - Open the file: `create_social_calendar_table.sql` in your project
   - **Copy the ENTIRE contents** (everything from the file)
   - **Paste it into Supabase SQL Editor**
   - **Click "Run"**

3. **Verify Creation**:
   - Go to **Table Editor** in Supabase
   - Look for `social_calendar_tasks` table
   - It should have these columns:
     - `id` (UUID)
     - `title` (TEXT)
     - `date` (DATE)
     - `client_id` (UUID)
     - `client_name` (TEXT)
     - `team` (TEXT)
     - `created_at` (TIMESTAMP)
     - `updated_at` (TIMESTAMP)

### **STEP 2: Fix Build/Import Issues**

1. **Clear Build Cache**:
   ```bash
   # Stop the dev server (Ctrl+C)
   rm -rf node_modules/.vite
   npm run dev
   ```

2. **Force Refresh Browser**:
   - **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - **Clear browser cache** for the localhost:5173 site

### **STEP 3: Test the Fixes**

1. **Open Social Calendar** in your browser
2. **Check Console** (F12 → Console tab)
3. **Try Creating a Task**:
   - Select a client from dropdown
   - Click "Add Task"
   - Enter task name and date
   - Click "Create Task"

## 🎯 **Expected Results After Fixes:**

✅ **No 404 errors** in browser console  
✅ **Task creation works** successfully  
✅ **Client dropdown loads** without errors  
✅ **Manual refresh button works**  
✅ **Tasks display** on calendar dates  

## 🔍 **Troubleshooting:**

### **If SQL Script Fails:**
- **Check Permissions**: Make sure you're using the right Supabase project
- **Run in Parts**: Copy and run each section separately
- **Check Dependencies**: Ensure `clients` table exists first

### **If Imports Still Fail:**
1. **Restart Dev Server**:
   ```bash
   # Stop dev server
   npm run dev
   ```

2. **Check File Exists**:
   ```bash
   ls -la src/components/socialcalendar/SimpleSocialTaskModal.tsx
   ```

### **If refreshClients Error Persists:**
1. **Clear Browser Storage**:
   - F12 → Application → Storage → Clear Site Data
   
2. **Check DataContext**:
   - Make sure you're logged in properly
   - Check if other data loads (users, clients, tasks)

## 📋 **SQL Script Preview**
Here's what the SQL script will create:

```sql
-- Creates the social_calendar_tasks table
CREATE TABLE IF NOT EXISTS social_calendar_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    team TEXT NOT NULL CHECK (team IN ('creative', 'web')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adds performance indexes
-- Sets up Row Level Security (RLS)
-- Creates update triggers
```

## 🚀 **After Successful Setup:**

Your Social Calendar will have:
- ✅ **Client-specific task storage**
- ✅ **Real-time client refresh**
- ✅ **Dropdown client selection**
- ✅ **Task creation/editing/deletion**
- ✅ **Calendar view with task display**
- ✅ **Task statistics**

## 📞 **If You Need Help:**

1. **Check the SQL ran successfully** in Supabase
2. **Verify the table exists** in Table Editor
3. **Clear browser cache** completely
4. **Restart the dev server**

The main issue is **definitely the missing database table** - once that's created, everything else should work! 🎉 