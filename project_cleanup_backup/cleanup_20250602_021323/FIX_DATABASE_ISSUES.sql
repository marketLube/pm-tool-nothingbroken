-- =====================================================
-- FIX DATABASE ISSUES - COMPREHENSIVE SOLUTION
-- =====================================================
-- Run this in your Supabase SQL Editor to fix all database issues
-- This addresses the specific problems found in the test results

-- =====================================================
-- 1. FIX USERS TABLE SCHEMA
-- =====================================================

-- Add missing join_date column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;

-- Update existing users to have join_date if null
UPDATE users 
SET join_date = CURRENT_DATE 
WHERE join_date IS NULL;

-- Make join_date NOT NULL after setting defaults
ALTER TABLE users 
ALTER COLUMN join_date SET NOT NULL;

-- Add other missing columns that might be needed
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS allowed_statuses TEXT[] DEFAULT ARRAY[]::TEXT[];

-- =====================================================
-- 2. FIX ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Disable RLS temporarily to allow setup
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for each table
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON statuses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON daily_work_entries;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON task_completions;

-- Also drop policies with our new names (belt and suspenders approach)
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on statuses" ON statuses;
DROP POLICY IF EXISTS "Allow all operations on daily_work_entries" ON daily_work_entries;
DROP POLICY IF EXISTS "Allow all operations on task_completions" ON task_completions;

-- Drop any other existing policies
DO $$ 
DECLARE
    policies RECORD;
BEGIN
    FOR policies IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                      policies.policyname, 
                      policies.tablename);
    END LOOP;
END $$;

-- Create permissive RLS policies for development
-- USERS TABLE
CREATE POLICY "Allow all operations on users" ON users
FOR ALL USING (true) WITH CHECK (true);

-- CLIENTS TABLE
CREATE POLICY "Allow all operations on clients" ON clients
FOR ALL USING (true) WITH CHECK (true);

-- TASKS TABLE
CREATE POLICY "Allow all operations on tasks" ON tasks
FOR ALL USING (true) WITH CHECK (true);

-- STATUSES TABLE
CREATE POLICY "Allow all operations on statuses" ON statuses
FOR ALL USING (true) WITH CHECK (true);

-- DAILY_WORK_ENTRIES TABLE
CREATE POLICY "Allow all operations on daily_work_entries" ON daily_work_entries
FOR ALL USING (true) WITH CHECK (true);

-- TASK_COMPLETIONS TABLE
CREATE POLICY "Allow all operations on task_completions" ON task_completions
FOR ALL USING (true) WITH CHECK (true);

-- Re-enable RLS with permissive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. ENSURE PROPER INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for foreign key relationships
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_daily_work_entries_user_id ON daily_work_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_work_entries_date ON daily_work_entries(date);

CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team);

CREATE INDEX IF NOT EXISTS idx_clients_team ON clients(team);
CREATE INDEX IF NOT EXISTS idx_statuses_team ON statuses(team);

-- =====================================================
-- 4. INSERT DEFAULT STATUSES IF THEY DON'T EXIST
-- =====================================================

-- Insert default statuses for creative team
INSERT INTO statuses (id, name, team, color, "order", created_at)
VALUES 
  (gen_random_uuid(), 'To Do', 'creative', '#6B7280', 1, NOW()),
  (gen_random_uuid(), 'In Progress', 'creative', '#3B82F6', 2, NOW()),
  (gen_random_uuid(), 'Review', 'creative', '#F59E0B', 3, NOW()),
  (gen_random_uuid(), 'Done', 'creative', '#10B981', 4, NOW())
ON CONFLICT DO NOTHING;

-- Insert default statuses for web team
INSERT INTO statuses (id, name, team, color, "order", created_at)
VALUES 
  (gen_random_uuid(), 'Backlog', 'web', '#6B7280', 1, NOW()),
  (gen_random_uuid(), 'Development', 'web', '#3B82F6', 2, NOW()),
  (gen_random_uuid(), 'Testing', 'web', '#F59E0B', 3, NOW()),
  (gen_random_uuid(), 'Deployed', 'web', '#10B981', 4, NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. CREATE SAMPLE DATA IF TABLES ARE EMPTY
-- =====================================================

-- Insert sample users if users table is empty
INSERT INTO users (id, name, email, team, role, password, join_date, is_active, created_at)
SELECT 
  gen_random_uuid(),
  'Admin User',
  'admin@marketlube.com',
  'creative',
  'admin',
  'admin123',
  CURRENT_DATE,
  true,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO users (id, name, email, team, role, password, join_date, is_active, created_at)
SELECT 
  gen_random_uuid(),
  'Creative Manager',
  'creative@marketlube.com',
  'creative',
  'manager',
  'creative123',
  CURRENT_DATE,
  true,
  NOW()
WHERE (SELECT COUNT(*) FROM users) < 2;

INSERT INTO users (id, name, email, team, role, password, join_date, is_active, created_at)
SELECT 
  gen_random_uuid(),
  'Web Developer',
  'web@marketlube.com',
  'web',
  'employee',
  'web123',
  CURRENT_DATE,
  true,
  NOW()
WHERE (SELECT COUNT(*) FROM users) < 3;

-- Insert sample clients if clients table is empty
INSERT INTO clients (id, name, industry, contact_person, email, phone, team, date_added, created_at)
SELECT 
  gen_random_uuid(),
  'Sample Client',
  'Technology',
  'John Doe',
  'contact@sampleclient.com',
  '+1-555-0123',
  'creative',
  CURRENT_DATE,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM clients LIMIT 1);

-- =====================================================
-- 6. VERIFY SETUP
-- =====================================================

-- Check table counts
SELECT 
  'users' as table_name, 
  COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
  'clients' as table_name, 
  COUNT(*) as record_count 
FROM clients
UNION ALL
SELECT 
  'tasks' as table_name, 
  COUNT(*) as record_count 
FROM tasks
UNION ALL
SELECT 
  'statuses' as table_name, 
  COUNT(*) as record_count 
FROM statuses
UNION ALL
SELECT 
  'daily_work_entries' as table_name, 
  COUNT(*) as record_count 
FROM daily_work_entries
UNION ALL
SELECT 
  'task_completions' as table_name, 
  COUNT(*) as record_count 
FROM task_completions;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '📊 All tables have been configured with proper schemas';
  RAISE NOTICE '🔒 RLS policies have been set to allow all operations';
  RAISE NOTICE '📈 Performance indexes have been created';
  RAISE NOTICE '🎯 Default statuses and sample data have been inserted';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your PM Tool database is now ready for use!';
END $$; 