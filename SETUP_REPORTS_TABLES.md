# Reports & Analytics Database Setup

## Step 1: Create Tables in Supabase Dashboard

Go to your Supabase dashboard → SQL Editor and run the following SQL:

```sql
-- Create daily_work_entries table
CREATE TABLE IF NOT EXISTS daily_work_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  is_absent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_work_entries
CREATE POLICY "Users can view their own work entries" ON daily_work_entries
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own work entries" ON daily_work_entries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own work entries" ON daily_work_entries
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all work entries" ON daily_work_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert all work entries" ON daily_work_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all work entries" ON daily_work_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Create RLS policies for task_completions
CREATE POLICY "Users can view their own task completions" ON task_completions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own task completions" ON task_completions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all task completions" ON task_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert all task completions" ON task_completions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_id ON daily_work_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_date ON daily_work_entries(date);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_date ON task_completions(date);
```

## Step 2: Run Mock Data Script

After creating the tables, run:
```bash
node add_mock_reports_data_fixed.js
```

## Step 3: Test the Reports & Analytics Page

Navigate to the Reports & Analytics page in your application to see the mock data in action.

## Troubleshooting

If you encounter any issues:

1. **Tables not found**: Make sure you ran the SQL in Step 1
2. **Permission denied**: Check that RLS policies are correctly set up
3. **No data showing**: Verify that mock data was inserted successfully

## Manual Data Verification

You can check if data was inserted by running these queries in Supabase SQL Editor:

```sql
-- Check daily work entries
SELECT * FROM daily_work_entries ORDER BY date DESC LIMIT 10;

-- Check task completions
SELECT * FROM task_completions ORDER BY completed_at DESC LIMIT 10;

-- Check users and their work entries
SELECT u.name, dwe.date, dwe.check_in_time, dwe.check_out_time, dwe.is_absent
FROM users u
LEFT JOIN daily_work_entries dwe ON u.id = dwe.user_id
ORDER BY dwe.date DESC, u.name;
``` 