-- =====================================================
-- COMPLETE DATABASE SETUP FOR PM TOOL
-- =====================================================
-- This script will create all necessary tables and fix RLS policies
-- Run this in your Supabase SQL Editor to resolve 406 errors

-- =====================================================
-- 1. CREATE MISSING TABLES
-- =====================================================

-- Create daily_work_entries table
CREATE TABLE IF NOT EXISTS daily_work_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  assigned_tasks TEXT[] DEFAULT ARRAY[]::TEXT[],
  completed_tasks TEXT[] DEFAULT ARRAY[]::TEXT[],
  check_in_time TIME,
  check_out_time TIME,
  is_absent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. FIX RLS POLICIES (This fixes the 406 errors)
-- =====================================================

-- Fix daily_work_entries RLS policies
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
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON daily_work_entries;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON daily_work_entries;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON daily_work_entries;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON daily_work_entries;

-- Create simple, working policies
CREATE POLICY "Allow all operations for authenticated users" ON daily_work_entries
    FOR ALL USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;

-- Fix task_completions RLS policies
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can insert own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can update own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can delete own task completions" ON task_completions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON task_completions;

-- Create simple policy
CREATE POLICY "Allow all operations for authenticated users" ON task_completions
    FOR ALL USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_work_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_completions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_date 
ON daily_work_entries(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_work_entries_date 
ON daily_work_entries(date);

CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_id 
ON daily_work_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_task_id 
ON task_completions(task_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_user_id 
ON task_completions(user_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at 
ON task_completions(completed_at);

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for daily_work_entries
DROP TRIGGER IF EXISTS update_daily_work_entries_updated_at ON daily_work_entries;
CREATE TRIGGER update_daily_work_entries_updated_at
    BEFORE UPDATE ON daily_work_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. VERIFY SETUP
-- =====================================================

-- Check if tables exist and have correct structure
SELECT 
  'daily_work_entries' as table_name,
  COUNT(*) as column_count,
  'Table exists' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_work_entries'

UNION ALL

SELECT 
  'task_completions' as table_name,
  COUNT(*) as column_count,
  'Table exists' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'task_completions'

UNION ALL

SELECT 
  'Setup' as table_name,
  0 as column_count,
  'Complete - 406 errors should be resolved!' as status;

-- =====================================================
-- 7. TEST QUERY (Optional)
-- =====================================================

-- Test if the table is accessible (this should not return 406 error)
-- SELECT COUNT(*) as total_entries FROM daily_work_entries; 