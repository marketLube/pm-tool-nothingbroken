-- =====================================================
-- COMPLETE SETUP - FUNCTIONS AND POLICIES ONLY
-- =====================================================
-- Run this after adding the missing columns to complete the setup

-- =====================================================
-- 1. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on daily_work_entries (if not already enabled)
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Users can insert own daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Users can update own daily work entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Users can delete own daily work entries" ON daily_work_entries;

-- Policy: Users can view their own entries, admins can view all
CREATE POLICY "Users can view own daily work entries" ON daily_work_entries
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Users can insert their own entries, admins can insert for anyone
CREATE POLICY "Users can insert own daily work entries" ON daily_work_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Users can update their own entries, admins can update any
CREATE POLICY "Users can update own daily work entries" ON daily_work_entries
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Users can delete their own entries, admins can delete any
CREATE POLICY "Users can delete own daily work entries" ON daily_work_entries
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Enable RLS on task_completions (if not already enabled)
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can insert own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can update own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can delete own task completions" ON task_completions;

-- Policy: Users can view their own completions, admins can view all
CREATE POLICY "Users can view own task completions" ON task_completions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Users can insert their own completions
CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own completions
CREATE POLICY "Users can update own task completions" ON task_completions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own completions
CREATE POLICY "Users can delete own task completions" ON task_completions
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. PERFORMANCE INDEXES
-- =====================================================

-- Add indexes for better performance on daily work entries
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_date 
ON daily_work_entries(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_work_entries_date 
ON daily_work_entries(date);

CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_id 
ON daily_work_entries(user_id);

-- Add indexes for task completions
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id 
ON task_completions(task_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_user_id 
ON task_completions(user_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at 
ON task_completions(completed_at);

-- =====================================================
-- 3. CORE FUNCTIONS FOR TASK MANAGEMENT
-- =====================================================

-- Function to automatically move unfinished tasks to next day
CREATE OR REPLACE FUNCTION move_unfinished_tasks_to_next_day(
  p_user_id UUID,
  p_from_date DATE,
  p_to_date DATE
) RETURNS VOID AS $$
DECLARE
  v_previous_entry RECORD;
  v_next_entry RECORD;
  v_unfinished_tasks TEXT[];
  v_updated_assigned_tasks TEXT[];
BEGIN
  -- Get previous day's entry
  SELECT * INTO v_previous_entry
  FROM daily_work_entries
  WHERE user_id = p_user_id AND date = p_from_date;
  
  -- If no previous entry or no assigned tasks, return
  IF v_previous_entry IS NULL OR 
     v_previous_entry.assigned_tasks IS NULL OR 
     array_length(v_previous_entry.assigned_tasks, 1) = 0 THEN
    RETURN;
  END IF;
  
  -- Find unfinished tasks (assigned but not completed)
  SELECT array_agg(task_id) INTO v_unfinished_tasks
  FROM unnest(v_previous_entry.assigned_tasks) AS task_id
  WHERE task_id NOT IN (
    SELECT unnest(COALESCE(v_previous_entry.completed_tasks, ARRAY[]::TEXT[]))
  );
  
  -- If no unfinished tasks, return
  IF v_unfinished_tasks IS NULL OR array_length(v_unfinished_tasks, 1) = 0 THEN
    RETURN;
  END IF;
  
  -- Get or create next day's entry
  SELECT * INTO v_next_entry
  FROM daily_work_entries
  WHERE user_id = p_user_id AND date = p_to_date;
  
  IF v_next_entry IS NULL THEN
    -- Create new entry for next day
    INSERT INTO daily_work_entries (
      id, user_id, date, assigned_tasks, completed_tasks, 
      check_in_time, check_out_time, is_absent, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), p_user_id, p_to_date, v_unfinished_tasks, ARRAY[]::TEXT[],
      NULL, NULL, FALSE, NOW(), NOW()
    );
  ELSE
    -- Update existing entry, avoiding duplicates
    SELECT array_agg(DISTINCT task_id) INTO v_updated_assigned_tasks
    FROM (
      SELECT unnest(COALESCE(v_next_entry.assigned_tasks, ARRAY[]::TEXT[])) AS task_id
      UNION
      SELECT unnest(v_unfinished_tasks) AS task_id
    ) AS combined_tasks;
    
    UPDATE daily_work_entries
    SET assigned_tasks = v_updated_assigned_tasks,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_to_date;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_work_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_completions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION move_unfinished_tasks_to_next_day(UUID, DATE, DATE) TO authenticated;

-- =====================================================
-- 5. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_daily_work_entry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_daily_work_entry_timestamp ON daily_work_entries;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_daily_work_entry_timestamp
  BEFORE UPDATE ON daily_work_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_work_entry_timestamp();

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Verify setup by checking what was created
SELECT 
  'Tables' as component,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN ('daily_work_entries', 'task_completions')
  AND table_schema = 'public'

UNION ALL

SELECT 
  'Functions' as component,
  COUNT(*) as count
FROM information_schema.routines 
WHERE routine_name IN ('move_unfinished_tasks_to_next_day')
  AND routine_schema = 'public'

UNION ALL

SELECT 
  'Indexes' as component,
  COUNT(*) as count
FROM pg_indexes 
WHERE indexname LIKE 'idx_daily_work_entries%'
   OR indexname LIKE 'idx_task_completions%';

-- Check final table structure
SELECT 
  'daily_work_entries columns' as info,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_work_entries';

-- Setup complete message
SELECT 'Setup completed successfully! Your Reports & Analytics feature is ready to use.' as status; 