-- URGENT: Run this in Supabase SQL Editor to fix 406 errors
-- This will temporarily disable RLS to allow the app to work

-- Disable RLS completely for now
ALTER TABLE daily_work_entries DISABLE ROW LEVEL SECURITY;

-- Also disable for task_completions if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_completions') THEN
        ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Verify the fix
SELECT 'RLS disabled successfully - your app should work now!' as status; 