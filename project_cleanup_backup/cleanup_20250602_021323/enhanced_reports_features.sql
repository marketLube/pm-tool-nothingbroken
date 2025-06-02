-- Enhanced Reports & Analytics Features SQL
-- This file contains SQL queries to support the new functionality:
-- 1. Task completion tracking
-- 2. Automatic task rollover from previous days
-- 3. Absence handling with completed tasks
-- 4. Performance optimizations

-- Add indexes for better performance on daily work entries
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_date 
ON daily_work_entries(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_work_entries_date 
ON daily_work_entries(date);

CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_id 
ON daily_work_entries(user_id);

-- Create a function to automatically move unfinished tasks to next day
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
$$ LANGUAGE plpgsql;

-- Create a function to process weekly task rollover
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
$$ LANGUAGE plpgsql;

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

-- Create a function to get task completion rate for a user
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
$$ LANGUAGE plpgsql;

-- Create a function to get team productivity metrics
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
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update timestamps
CREATE OR REPLACE FUNCTION update_daily_work_entry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_daily_work_entry_timestamp ON daily_work_entries;
CREATE TRIGGER trigger_update_daily_work_entry_timestamp
  BEFORE UPDATE ON daily_work_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_work_entry_timestamp();

-- Create a function to clean up old rollover data (optional maintenance)
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
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_work_entries TO authenticated;
GRANT SELECT ON daily_task_summary TO authenticated;
GRANT EXECUTE ON FUNCTION move_unfinished_tasks_to_next_day(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION process_weekly_task_rollover(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_completion_rate(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_productivity_metrics(TEXT, DATE, DATE) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION move_unfinished_tasks_to_next_day IS 'Automatically moves unfinished tasks from one day to the next';
COMMENT ON FUNCTION process_weekly_task_rollover IS 'Processes task rollover for an entire week for a specific user';
COMMENT ON FUNCTION get_user_completion_rate IS 'Calculates task completion rate for a user within a date range';
COMMENT ON FUNCTION get_team_productivity_metrics IS 'Returns productivity metrics for a team within a date range';
COMMENT ON VIEW daily_task_summary IS 'Provides a summary view of daily task activities with user information'; 