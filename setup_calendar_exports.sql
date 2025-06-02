-- Setup Calendar Exports Table for Social/Project Calendar Sharing
-- Run this script in your Supabase SQL Editor

-- Drop table if it exists (for fresh start)
DROP TABLE IF EXISTS calendar_exports CASCADE;

-- Create calendar_exports table
CREATE TABLE calendar_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    team VARCHAR(50) NOT NULL CHECK (team IN ('creative', 'web', 'all')),
    tasks JSONB NOT NULL DEFAULT '[]',
    created_by UUID NULL, -- Allow NULL for system exports
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_calendar_exports_token ON calendar_exports(token);
CREATE INDEX idx_calendar_exports_client_id ON calendar_exports(client_id);
CREATE INDEX idx_calendar_exports_expires_at ON calendar_exports(expires_at);
CREATE INDEX idx_calendar_exports_team ON calendar_exports(team);

-- Enable Row Level Security
ALTER TABLE calendar_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy for authenticated users to create exports
CREATE POLICY "authenticated_can_create_exports" ON calendar_exports
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to view their own exports
CREATE POLICY "users_can_view_own_exports" ON calendar_exports
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        (created_by = auth.uid() OR created_by IS NULL)
    );

-- Policy for public access to non-expired exports (for client viewing)
CREATE POLICY "public_can_view_valid_exports" ON calendar_exports
    FOR SELECT 
    USING (expires_at > NOW());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_calendar_exports_updated_at
    BEFORE UPDATE ON calendar_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_exports_updated_at();

-- Function to clean up expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_calendar_exports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM calendar_exports WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON calendar_exports TO authenticated;
GRANT SELECT ON calendar_exports TO anon;

-- Test the table creation
DO $$
BEGIN
    -- Insert a test record to verify everything works
    INSERT INTO calendar_exports (
        token,
        client_id, 
        client_name,
        team,
        tasks,
        expires_at
    ) VALUES (
        'test_token_' || extract(epoch from now()),
        'test_client_id',
        'Test Client',
        'creative',
        '[]'::jsonb,
        NOW() + INTERVAL '1 minute'
    );
    
    -- Clean up test record
    DELETE FROM calendar_exports WHERE token LIKE 'test_token_%';
    
    RAISE NOTICE 'Calendar exports table created and tested successfully!';
END;
$$; 