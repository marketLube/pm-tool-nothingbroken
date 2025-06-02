-- =====================================================
-- Social Calendar Tasks Table Setup
-- =====================================================

-- Create the social_calendar_tasks table
CREATE TABLE IF NOT EXISTS social_calendar_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    team TEXT NOT NULL CHECK (team IN ('creative', 'web')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS social_calendar_tasks_date_idx ON social_calendar_tasks(date);
CREATE INDEX IF NOT EXISTS social_calendar_tasks_client_id_idx ON social_calendar_tasks(client_id);
CREATE INDEX IF NOT EXISTS social_calendar_tasks_client_name_idx ON social_calendar_tasks(client_name);
CREATE INDEX IF NOT EXISTS social_calendar_tasks_team_idx ON social_calendar_tasks(team);

-- Create a compound index for common queries
CREATE INDEX IF NOT EXISTS social_calendar_tasks_client_date_idx ON social_calendar_tasks(client_id, date);

-- Set up Row Level Security (RLS)
ALTER TABLE social_calendar_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view social calendar tasks" ON social_calendar_tasks;
DROP POLICY IF EXISTS "Users can create social calendar tasks" ON social_calendar_tasks;
DROP POLICY IF EXISTS "Users can update social calendar tasks" ON social_calendar_tasks;
DROP POLICY IF EXISTS "Users can delete social calendar tasks" ON social_calendar_tasks;

-- RLS Policies for social_calendar_tasks
-- Allow authenticated users to view all tasks
CREATE POLICY "Users can view social calendar tasks"
    ON social_calendar_tasks FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to create tasks
CREATE POLICY "Users can create social calendar tasks"
    ON social_calendar_tasks FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update tasks
CREATE POLICY "Users can update social calendar tasks"
    ON social_calendar_tasks FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete tasks
CREATE POLICY "Users can delete social calendar tasks"
    ON social_calendar_tasks FOR DELETE
    TO authenticated
    USING (true);

-- Create trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_calendar_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_social_calendar_tasks_updated_at_trigger ON social_calendar_tasks;

-- Create the trigger
CREATE TRIGGER update_social_calendar_tasks_updated_at_trigger
    BEFORE UPDATE ON social_calendar_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_social_calendar_tasks_updated_at();

-- =====================================================
-- Migration for existing installations
-- =====================================================

-- If you already have the table but missing the client_name column:
-- ALTER TABLE social_calendar_tasks ADD COLUMN IF NOT EXISTS client_name TEXT;

-- If you need to populate client_name from existing data:
-- UPDATE social_calendar_tasks 
-- SET client_name = clients.name 
-- FROM clients 
-- WHERE social_calendar_tasks.client_id = clients.id 
-- AND social_calendar_tasks.client_name IS NULL;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if table was created successfully
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'social_calendar_tasks' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'social_calendar_tasks';

-- Check RLS policies
-- SELECT policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'social_calendar_tasks'; 