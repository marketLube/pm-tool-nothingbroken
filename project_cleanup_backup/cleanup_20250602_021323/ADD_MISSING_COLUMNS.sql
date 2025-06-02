-- =====================================================
-- ADD MISSING COLUMNS TO EXISTING TABLE
-- =====================================================
-- Run this to add the missing columns to your daily_work_entries table

-- Add the missing assigned_tasks and completed_tasks columns
ALTER TABLE daily_work_entries 
ADD COLUMN IF NOT EXISTS assigned_tasks TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE daily_work_entries 
ADD COLUMN IF NOT EXISTS completed_tasks TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Verify the columns were added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_work_entries'
ORDER BY ordinal_position; 