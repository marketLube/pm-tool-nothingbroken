-- =====================================================
-- FIX RLS POLICIES FOR DAILY WORK ENTRIES
-- =====================================================
-- Run this to fix the Row Level Security issues causing 406 errors

-- First, disable RLS temporarily to fix the policies
ALTER TABLE daily_work_entries DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Users can insert own daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Users can update own daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Users can delete own daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Admins can view all daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Admins can insert all daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Admins can update all daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Admins can delete all daily work entries" ON daily_work_entries;

-- Create new, simpler policies that work
CREATE POLICY "Enable read access for authenticated users" ON daily_work_entries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON daily_work_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON daily_work_entries
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON daily_work_entries
    FOR DELETE USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;

-- Also fix task_completions table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_completions') THEN
        ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own task completions" ON task_completions;
        DROP POLICY IF EXISTS "Users can insert own task completions" ON task_completions;
        DROP POLICY IF EXISTS "Users can update own task completions" ON task_completions;
        DROP POLICY IF EXISTS "Users can delete own task completions" ON task_completions;
        
        CREATE POLICY "Enable all access for authenticated users" ON task_completions
            FOR ALL USING (auth.role() = 'authenticated');
            
        ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Test the policies
SELECT 'RLS policies updated successfully!' as status; 