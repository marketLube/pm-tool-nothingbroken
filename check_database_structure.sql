-- =====================================================
-- CHECK DATABASE STRUCTURE
-- =====================================================
-- Run this in Supabase SQL Editor to see what exists

-- 1. Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('daily_work_entries', 'task_completions', 'users', 'tasks')
ORDER BY table_name;

-- 2. Check columns in daily_work_entries table (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_work_entries'
ORDER BY ordinal_position;

-- 3. Check columns in task_completions table (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'task_completions'
ORDER BY ordinal_position;

-- 4. Check existing users table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 5. Check existing tasks table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tasks'
ORDER BY ordinal_position; 