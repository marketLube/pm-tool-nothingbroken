-- =====================================================
-- COMPLETE SUPABASE QUERIES FOR ENHANCED REPORTS
-- =====================================================
-- Copy and paste these queries into your Supabase SQL Editor
-- Execute them in order to set up all enhanced features

-- =====================================================
-- 1. CREATE TABLES (if not already created)
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
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on daily_work_entries
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;

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

-- Enable RLS on task_completions
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

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
-- 4. CORE FUNCTIONS FOR TASK MANAGEMENT
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
  
  -- Update previous day's entry to remove unfinished tasks
  UPDATE daily_work_entries
  SET assigned_tasks = (
    SELECT array_agg(task_id)
    FROM unnest(assigned_tasks) AS task_id
    WHERE task_id = ANY(COALESCE(completed_tasks, ARRAY[]::TEXT[]))
  ),
  updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_from_date;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process weekly task rollover
CREATE OR REPLACE FUNCTION process_weekly_task_rollover(
  p_user_id UUID,
  p_week_start_date DATE
) RETURNS VOID AS $$
DECLARE
  v_current_date DATE;
  v_next_date DATE;
  v_day_counter INTEGER;
BEGIN
  -- Process each day of the week (Monday to Sunday)
  FOR v_day_counter IN 1..6 LOOP
    v_current_date := p_week_start_date + (v_day_counter - 1);
    v_next_date := p_week_start_date + v_day_counter;
    
    -- Move unfinished tasks from current day to next day
    PERFORM move_unfinished_tasks_to_next_day(p_user_id, v_current_date, v_next_date);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ANALYTICS AND REPORTING FUNCTIONS
-- =====================================================

-- Function to get task completion rate for a user
CREATE OR REPLACE FUNCTION get_user_completion_rate(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_total_assigned INTEGER;
  v_total_completed INTEGER;
  v_completion_rate DECIMAL;
BEGIN
  SELECT 
    COALESCE(SUM(array_length(assigned_tasks, 1)), 0),
    COALESCE(SUM(array_length(completed_tasks, 1)), 0)
  INTO v_total_assigned, v_total_completed
  FROM daily_work_entries
  WHERE user_id = p_user_id 
    AND date BETWEEN p_start_date AND p_end_date
    AND is_absent = false;
  
  IF v_total_assigned = 0 THEN
    RETURN 0;
  END IF;
  
  v_completion_rate := (v_total_completed::DECIMAL / v_total_assigned::DECIMAL) * 100;
  RETURN ROUND(v_completion_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team productivity metrics
CREATE OR REPLACE FUNCTION get_team_productivity_metrics(
  p_team_name TEXT,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  metric_name TEXT,
  metric_value DECIMAL,
  metric_unit TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH team_stats AS (
    SELECT 
      COUNT(DISTINCT dwe.user_id) as active_members,
      COUNT(DISTINCT dwe.date) as working_days,
      COALESCE(SUM(array_length(dwe.assigned_tasks, 1)), 0) as total_assigned,
      COALESCE(SUM(array_length(dwe.completed_tasks, 1)), 0) as total_completed,
      COUNT(CASE WHEN dwe.is_absent THEN 1 END) as absent_days,
      COUNT(*) as total_entries
    FROM daily_work_entries dwe
    JOIN users u ON dwe.user_id = u.id
    WHERE u.team = p_team_name 
      AND u.is_active = true
      AND dwe.date BETWEEN p_start_date AND p_end_date
  )
  SELECT 'completion_rate'::TEXT, 
         CASE WHEN total_assigned > 0 
              THEN ROUND((total_completed::DECIMAL / total_assigned::DECIMAL) * 100, 2)
              ELSE 0 END,
         'percentage'::TEXT
  FROM team_stats
  UNION ALL
  SELECT 'attendance_rate'::TEXT,
         CASE WHEN total_entries > 0
              THEN ROUND(((total_entries - absent_days)::DECIMAL / total_entries::DECIMAL) * 100, 2)
              ELSE 0 END,
         'percentage'::TEXT
  FROM team_stats
  UNION ALL
  SELECT 'avg_tasks_per_day'::TEXT,
         CASE WHEN working_days > 0 AND active_members > 0
              THEN ROUND(total_assigned::DECIMAL / (working_days * active_members)::DECIMAL, 2)
              ELSE 0 END,
         'tasks'::TEXT
  FROM team_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VIEWS FOR REPORTING
-- =====================================================

-- Create a view for daily task summary
CREATE OR REPLACE VIEW daily_task_summary AS
SELECT 
  dwe.user_id,
  dwe.date,
  u.name as user_name,
  u.team,
  dwe.is_absent,
  dwe.check_in_time,
  dwe.check_out_time,
  COALESCE(array_length(dwe.assigned_tasks, 1), 0) as assigned_count,
  COALESCE(array_length(dwe.completed_tasks, 1), 0) as completed_count,
  CASE 
    WHEN dwe.is_absent THEN 'absent'
    WHEN dwe.check_in_time IS NOT NULL AND dwe.check_out_time IS NOT NULL THEN 'full_day'
    WHEN dwe.check_in_time IS NOT NULL THEN 'partial_day'
    ELSE 'no_activity'
  END as attendance_status,
  dwe.created_at,
  dwe.updated_at
FROM daily_work_entries dwe
JOIN users u ON dwe.user_id = u.id
WHERE u.is_active = true;

-- Create a view for weekly productivity summary
CREATE OR REPLACE VIEW weekly_productivity_summary AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.team,
  DATE_TRUNC('week', dwe.date)::DATE as week_start,
  COUNT(DISTINCT dwe.date) as days_worked,
  COUNT(CASE WHEN dwe.is_absent THEN 1 END) as days_absent,
  COALESCE(SUM(array_length(dwe.assigned_tasks, 1)), 0) as total_assigned,
  COALESCE(SUM(array_length(dwe.completed_tasks, 1)), 0) as total_completed,
  CASE 
    WHEN COALESCE(SUM(array_length(dwe.assigned_tasks, 1)), 0) > 0 
    THEN ROUND((COALESCE(SUM(array_length(dwe.completed_tasks, 1)), 0)::DECIMAL / 
                COALESCE(SUM(array_length(dwe.assigned_tasks, 1)), 1)::DECIMAL) * 100, 2)
    ELSE 0 
  END as completion_rate
FROM users u
LEFT JOIN daily_work_entries dwe ON u.id = dwe.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.team, DATE_TRUNC('week', dwe.date)
ORDER BY week_start DESC, u.name;

-- =====================================================
-- 7. TRIGGERS FOR AUTOMATIC UPDATES
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

-- Function to automatically update task completion timestamps
CREATE OR REPLACE FUNCTION update_task_completion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task completions
CREATE TRIGGER trigger_update_task_completion_timestamp
  BEFORE INSERT ON task_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_task_completion_timestamp();

-- =====================================================
-- 8. UTILITY FUNCTIONS
-- =====================================================

-- Function to clean up old daily entries (maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_daily_entries(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM daily_work_entries
  WHERE date < CURRENT_DATE - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current week summary
CREATE OR REPLACE FUNCTION get_user_week_summary(
  p_user_id UUID,
  p_week_start DATE DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE
) RETURNS TABLE(
  date DATE,
  is_absent BOOLEAN,
  assigned_count INTEGER,
  completed_count INTEGER,
  check_in_time TIME,
  check_out_time TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dwe.date,
    dwe.is_absent,
    COALESCE(array_length(dwe.assigned_tasks, 1), 0) as assigned_count,
    COALESCE(array_length(dwe.completed_tasks, 1), 0) as completed_count,
    dwe.check_in_time,
    dwe.check_out_time
  FROM daily_work_entries dwe
  WHERE dwe.user_id = p_user_id
    AND dwe.date BETWEEN p_week_start AND (p_week_start + INTERVAL '6 days')::DATE
  ORDER BY dwe.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk assign tasks to a user for a date
CREATE OR REPLACE FUNCTION bulk_assign_tasks(
  p_user_id UUID,
  p_date DATE,
  p_task_ids TEXT[]
) RETURNS VOID AS $$
DECLARE
  v_existing_entry RECORD;
  v_updated_tasks TEXT[];
BEGIN
  -- Get existing entry
  SELECT * INTO v_existing_entry
  FROM daily_work_entries
  WHERE user_id = p_user_id AND date = p_date;
  
  IF v_existing_entry IS NULL THEN
    -- Create new entry
    INSERT INTO daily_work_entries (
      user_id, date, assigned_tasks, completed_tasks, 
      is_absent, created_at, updated_at
    ) VALUES (
      p_user_id, p_date, p_task_ids, ARRAY[]::TEXT[],
      FALSE, NOW(), NOW()
    );
  ELSE
    -- Merge with existing tasks (avoid duplicates)
    SELECT array_agg(DISTINCT task_id) INTO v_updated_tasks
    FROM (
      SELECT unnest(COALESCE(v_existing_entry.assigned_tasks, ARRAY[]::TEXT[])) AS task_id
      UNION
      SELECT unnest(p_task_ids) AS task_id
    ) AS combined_tasks;
    
    UPDATE daily_work_entries
    SET assigned_tasks = v_updated_tasks,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_work_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_completions TO authenticated;
GRANT SELECT ON daily_task_summary TO authenticated;
GRANT SELECT ON weekly_productivity_summary TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION move_unfinished_tasks_to_next_day(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION process_weekly_task_rollover(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_completion_rate(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_productivity_metrics(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_daily_entries(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_week_summary(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_assign_tasks(UUID, DATE, TEXT[]) TO authenticated;

-- =====================================================
-- 10. DOCUMENTATION COMMENTS
-- =====================================================

-- Add comments for documentation
COMMENT ON TABLE daily_work_entries IS 'Stores daily work activities for each user including assigned and completed tasks';
COMMENT ON TABLE task_completions IS 'Tracks when tasks are completed by users with optional notes';

COMMENT ON FUNCTION move_unfinished_tasks_to_next_day IS 'Automatically moves unfinished tasks from one day to the next';
COMMENT ON FUNCTION process_weekly_task_rollover IS 'Processes task rollover for an entire week for a specific user';
COMMENT ON FUNCTION get_user_completion_rate IS 'Calculates task completion rate for a user within a date range';
COMMENT ON FUNCTION get_team_productivity_metrics IS 'Returns productivity metrics for a team within a date range';
COMMENT ON FUNCTION cleanup_old_daily_entries IS 'Removes old daily work entries beyond specified retention period';
COMMENT ON FUNCTION get_user_week_summary IS 'Returns a summary of user activities for a specific week';
COMMENT ON FUNCTION bulk_assign_tasks IS 'Assigns multiple tasks to a user for a specific date';

COMMENT ON VIEW daily_task_summary IS 'Provides a summary view of daily task activities with user information';
COMMENT ON VIEW weekly_productivity_summary IS 'Provides weekly productivity metrics grouped by user and week';

-- =====================================================
-- 11. SAMPLE DATA INSERTION (OPTIONAL)
-- =====================================================

-- Uncomment the following section if you want to insert sample data for testing

/*
-- Insert sample daily work entries for testing
INSERT INTO daily_work_entries (user_id, date, assigned_tasks, completed_tasks, check_in_time, check_out_time, is_absent)
SELECT 
  u.id,
  CURRENT_DATE - (INTERVAL '1 day' * generate_series(0, 6)),
  ARRAY['task-1', 'task-2', 'task-3'],
  ARRAY['task-1'],
  '09:00:00'::TIME,
  '17:00:00'::TIME,
  CASE WHEN random() < 0.1 THEN TRUE ELSE FALSE END
FROM users u
WHERE u.is_active = true
ON CONFLICT (user_id, date) DO NOTHING;
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify installation by running this query:
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
WHERE routine_name IN (
  'move_unfinished_tasks_to_next_day',
  'process_weekly_task_rollover',
  'get_user_completion_rate',
  'get_team_productivity_metrics'
)
  AND routine_schema = 'public'

UNION ALL

SELECT 
  'Views' as component,
  COUNT(*) as count
FROM information_schema.views 
WHERE table_name IN ('daily_task_summary', 'weekly_productivity_summary')
  AND table_schema = 'public'

UNION ALL

SELECT 
  'Indexes' as component,
  COUNT(*) as count
FROM pg_indexes 
WHERE indexname LIKE 'idx_daily_work_entries%'
   OR indexname LIKE 'idx_task_completions%';

-- If all counts show the expected numbers, your setup is complete! 