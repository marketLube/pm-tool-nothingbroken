-- =====================================================
-- SIMPLE REPORTS SETUP - ESSENTIAL TABLES ONLY
-- =====================================================
-- Run this first to create just the basic tables

-- 1. Create daily_work_entries table
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

-- 2. Create task_completions tableeeeee
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- 4. Basic RLS Policies for daily_work_entries
CREATE POLICY "Users can view own daily work entries" ON daily_work_entries
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own daily work entries" ON daily_work_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own daily work entries" ON daily_work_entries
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. Basic RLS Policies for task_completions
CREATE POLICY "Users can view own task completions" ON task_completions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_work_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_completions TO authenticated;

-- 7. Add basic indexes
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_date 
ON daily_work_entries(user_id, date);

CREATE INDEX IF NOT EXISTS idx_task_completions_task_id 
ON task_completions(task_id);

-- 8. Verify tables were created
SELECT 
  'daily_work_entries' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'daily_work_entries'

UNION ALL

SELECT 
  'task_completions' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'task_completions'; 