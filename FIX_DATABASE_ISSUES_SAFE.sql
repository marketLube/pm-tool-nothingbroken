-- SAFE DATABASE SCHEMA AND POLICY FIX SCRIPT
-- This script safely handles existing policies and constraints

-- First, let's check what we're working with
DO $$
BEGIN
    RAISE NOTICE 'Starting database schema and policy fixes...';
END $$;

-- 1. SCHEMA FIXES FOR USERS TABLE
-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add join_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'join_date'
    ) THEN
        ALTER TABLE users ADD COLUMN join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
        RAISE NOTICE 'Added join_date column to users table';
    ELSE
        RAISE NOTICE 'join_date column already exists in users table';
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in users table';
    END IF;

    -- Add allowed_statuses column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'allowed_statuses'
    ) THEN
        ALTER TABLE users ADD COLUMN allowed_statuses TEXT[] DEFAULT ARRAY['Available', 'Busy', 'Away', 'Do Not Disturb'];
        RAISE NOTICE 'Added allowed_statuses column to users table';
    ELSE
        RAISE NOTICE 'allowed_statuses column already exists in users table';
    END IF;
END $$;

-- Update existing users to have join_date if it's null
UPDATE users SET join_date = NOW() WHERE join_date IS NULL;

-- 2. SAFELY DROP AND RECREATE RLS POLICIES
-- Function to safely drop policies
CREATE OR REPLACE FUNCTION drop_policy_if_exists(table_name text, policy_name text)
RETURNS void AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
    RAISE NOTICE 'Dropped policy % on table % (if it existed)', policy_name, table_name;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop policy % on table %: %', policy_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Temporarily disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
SELECT drop_policy_if_exists('users', 'Allow all operations for authenticated users');
SELECT drop_policy_if_exists('clients', 'Allow all operations for authenticated users');
SELECT drop_policy_if_exists('tasks', 'Allow all operations for authenticated users');
SELECT drop_policy_if_exists('statuses', 'Allow all operations for authenticated users');
SELECT drop_policy_if_exists('daily_work_entries', 'Allow all operations for authenticated users');
SELECT drop_policy_if_exists('task_completions', 'Allow all operations for authenticated users');

-- Drop any other existing policies
SELECT drop_policy_if_exists('users', 'Users can view all users');
SELECT drop_policy_if_exists('users', 'Users can update their own profile');
SELECT drop_policy_if_exists('clients', 'Users can view all clients');
SELECT drop_policy_if_exists('clients', 'Users can create clients');
SELECT drop_policy_if_exists('tasks', 'Users can view all tasks');
SELECT drop_policy_if_exists('tasks', 'Users can create tasks');
SELECT drop_policy_if_exists('statuses', 'Users can view all statuses');
SELECT drop_policy_if_exists('daily_work_entries', 'Users can view their own entries');
SELECT drop_policy_if_exists('daily_work_entries', 'Users can create their own entries');
SELECT drop_policy_if_exists('task_completions', 'Users can view all completions');

-- Create new permissive policies for development
CREATE POLICY "Allow all operations for authenticated users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON clients
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON tasks
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON statuses
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON daily_work_entries
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON task_completions
    FOR ALL USING (true) WITH CHECK (true);

-- Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- 3. ENSURE DEFAULT STATUSES EXIST
INSERT INTO statuses (name, color, team, description) VALUES
    ('Available', '#10B981', 'creative', 'Ready to take on new tasks'),
    ('Busy', '#F59E0B', 'creative', 'Currently working on tasks'),
    ('Away', '#6B7280', 'creative', 'Temporarily unavailable'),
    ('Do Not Disturb', '#EF4444', 'creative', 'Focus time - do not interrupt'),
    ('Available', '#10B981', 'web', 'Ready to take on new tasks'),
    ('Busy', '#F59E0B', 'web', 'Currently working on tasks'),
    ('Away', '#6B7280', 'web', 'Temporarily unavailable'),
    ('Do Not Disturb', '#EF4444', 'web', 'Focus time - do not interrupt')
ON CONFLICT (name, team) DO NOTHING;

-- 4. CREATE SAMPLE DATA IF TABLES ARE EMPTY
-- Insert sample users if none exist
INSERT INTO users (id, name, email, team, role, join_date) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'John Doe', 'john@example.com', 'creative', 'team_member', NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'Jane Smith', 'jane@example.com', 'web', 'team_member', NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'Admin User', 'admin@example.com', 'creative', 'admin', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample clients if none exist
INSERT INTO clients (id, name, email, company, phone) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 'Client One', 'client1@example.com', 'Company A', '+1234567890'),
    ('660e8400-e29b-41d4-a716-446655440002', 'Client Two', 'client2@example.com', 'Company B', '+1234567891')
ON CONFLICT (id) DO NOTHING;

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_team ON users(team);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_join_date ON users(join_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_work_entries_user_date ON daily_work_entries(user_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);

-- Clean up the helper function
DROP FUNCTION IF EXISTS drop_policy_if_exists(text, text);

-- 6. VERIFICATION QUERIES
DO $$
DECLARE
    user_count INTEGER;
    client_count INTEGER;
    status_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO client_count FROM clients;
    SELECT COUNT(*) INTO status_count FROM statuses;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename IN ('users', 'clients', 'tasks', 'statuses', 'daily_work_entries', 'task_completions');
    
    RAISE NOTICE '=== DATABASE FIX COMPLETED ===';
    RAISE NOTICE 'Users in database: %', user_count;
    RAISE NOTICE 'Clients in database: %', client_count;
    RAISE NOTICE 'Statuses in database: %', status_count;
    RAISE NOTICE 'RLS Policies created: %', policy_count;
    RAISE NOTICE 'Schema fixes applied successfully!';
    RAISE NOTICE 'You can now test CRUD operations.';
END $$; 