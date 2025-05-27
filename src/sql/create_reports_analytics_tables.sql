-- Create daily_work_entries table
CREATE TABLE IF NOT EXISTS daily_work_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    is_absent BOOLEAN DEFAULT FALSE,
    assigned_tasks TEXT[] DEFAULT '{}',
    completed_tasks TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one entry per user per day
    UNIQUE(user_id, date)
);

-- Create task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    -- Ensure one completion per task per user
    UNIQUE(task_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_date ON daily_work_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_date ON daily_work_entries(date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completed_at ON task_completions(completed_at);

-- Create function to update updated_at timestamp
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

-- Enable Row Level Security (RLS)
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_work_entries
-- Users can view their own entries, admins can view all
CREATE POLICY "Users can view own daily work entries" ON daily_work_entries
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Users can insert their own entries, admins can insert for anyone
CREATE POLICY "Users can insert own daily work entries" ON daily_work_entries
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Users can update their own entries, admins can update any
CREATE POLICY "Users can update own daily work entries" ON daily_work_entries
    FOR UPDATE USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Users can delete their own entries, admins can delete any
CREATE POLICY "Users can delete own daily work entries" ON daily_work_entries
    FOR DELETE USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Create RLS policies for task_completions
-- Users can view completions for tasks assigned to them, admins can view all
CREATE POLICY "Users can view relevant task completions" ON task_completions
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE id = task_completions.task_id 
            AND assignee_id::text = auth.uid()::text
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Users can insert completions for their own tasks
CREATE POLICY "Users can insert task completions" ON task_completions
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text AND
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE id = task_completions.task_id 
            AND assignee_id::text = auth.uid()::text
        )
    );

-- Users can update their own completions, admins can update any
CREATE POLICY "Users can update own task completions" ON task_completions
    FOR UPDATE USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Users can delete their own completions, admins can delete any
CREATE POLICY "Users can delete own task completions" ON task_completions
    FOR DELETE USING (
        auth.uid()::text = user_id::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Create a view for easy reporting
CREATE OR REPLACE VIEW daily_reports AS
SELECT 
    dwe.id,
    dwe.user_id,
    u.name as user_name,
    u.team,
    u.role,
    dwe.date,
    dwe.check_in_time,
    dwe.check_out_time,
    dwe.is_absent,
    dwe.assigned_tasks,
    dwe.completed_tasks,
    array_length(dwe.assigned_tasks, 1) as assigned_count,
    array_length(dwe.completed_tasks, 1) as completed_count,
    CASE 
        WHEN dwe.check_in_time IS NOT NULL AND dwe.check_out_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (dwe.check_out_time - dwe.check_in_time)) / 3600
        ELSE NULL 
    END as hours_worked,
    dwe.created_at,
    dwe.updated_at
FROM daily_work_entries dwe
JOIN users u ON dwe.user_id = u.id
ORDER BY dwe.date DESC, u.name;

-- Grant permissions on the view
GRANT SELECT ON daily_reports TO authenticated;

-- Create a function to get team analytics
CREATE OR REPLACE FUNCTION get_team_analytics(
    team_name TEXT,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    total_days INTEGER,
    present_days INTEGER,
    absent_days INTEGER,
    total_assigned INTEGER,
    total_completed INTEGER,
    completion_rate NUMERIC,
    avg_hours_per_day NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.name as user_name,
        (end_date - start_date + 1)::INTEGER as total_days,
        COUNT(CASE WHEN NOT dwe.is_absent THEN 1 END)::INTEGER as present_days,
        COUNT(CASE WHEN dwe.is_absent THEN 1 END)::INTEGER as absent_days,
        COALESCE(SUM(array_length(dwe.assigned_tasks, 1)), 0)::INTEGER as total_assigned,
        COALESCE(SUM(array_length(dwe.completed_tasks, 1)), 0)::INTEGER as total_completed,
        CASE 
            WHEN COALESCE(SUM(array_length(dwe.assigned_tasks, 1)), 0) > 0 
            THEN ROUND((COALESCE(SUM(array_length(dwe.completed_tasks, 1)), 0)::NUMERIC / 
                       COALESCE(SUM(array_length(dwe.assigned_tasks, 1)), 1)::NUMERIC) * 100, 2)
            ELSE 0 
        END as completion_rate,
        ROUND(AVG(
            CASE 
                WHEN dwe.check_in_time IS NOT NULL AND dwe.check_out_time IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (dwe.check_out_time - dwe.check_in_time)) / 3600
                ELSE NULL 
            END
        ), 2) as avg_hours_per_day
    FROM users u
    LEFT JOIN daily_work_entries dwe ON u.id = dwe.user_id 
        AND dwe.date BETWEEN start_date AND end_date
    WHERE u.team = team_name AND u.is_active = true
    GROUP BY u.id, u.name
    ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_team_analytics(TEXT, DATE, DATE) TO authenticated; 