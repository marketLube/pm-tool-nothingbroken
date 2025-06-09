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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "authenticated_can_create_exports" ON calendar_exports;
DROP POLICY IF EXISTS "users_can_view_own_exports" ON calendar_exports;
DROP POLICY IF EXISTS "public_can_view_valid_exports" ON calendar_exports;

-- RLS Policies - Fixed for better compatibility
-- Policy for authenticated users to create exports
CREATE POLICY "authenticated_can_create_exports" ON calendar_exports
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to view exports (more permissive for team access)
CREATE POLICY "users_can_view_exports" ON calendar_exports
    FOR SELECT 
    TO authenticated
    USING (true);

-- Policy for public access to non-expired exports via token (for sharing)
CREATE POLICY "public_can_view_by_token" ON calendar_exports
    FOR SELECT 
    TO anon
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
DROP TRIGGER IF EXISTS update_calendar_exports_updated_at ON calendar_exports;
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

-- Grant permissions - More explicit
GRANT ALL PRIVILEGES ON calendar_exports TO authenticated;
GRANT SELECT ON calendar_exports TO anon;

-- Test the table creation with a more comprehensive test
DO $$
DECLARE
    test_token TEXT;
    test_record calendar_exports%ROWTYPE;
BEGIN
    -- Generate test token
    test_token := 'test_token_' || extract(epoch from now())::text;
    
    -- Insert a test record
    INSERT INTO calendar_exports (
        token,
        client_id, 
        client_name,
        team,
        tasks,
        expires_at
    ) VALUES (
        test_token,
        'test_client_id',
        'Test Client',
        'creative',
        '[{"id": "test", "title": "Test Task", "date": "2024-06-01"}]'::jsonb,
        NOW() + INTERVAL '1 minute'
    ) RETURNING * INTO test_record;
    
    -- Verify the record was created
    IF test_record.id IS NOT NULL THEN
        RAISE NOTICE 'SUCCESS: Test record created with ID % and token %', test_record.id, test_record.token;
    ELSE
        RAISE EXCEPTION 'FAILED: Test record was not created';
    END IF;
    
    -- Test token uniqueness
    BEGIN
        INSERT INTO calendar_exports (
            token,
            client_id, 
            client_name,
            team,
            tasks,
            expires_at
        ) VALUES (
            test_token, -- Same token should fail
            'test_client_id_2',
            'Test Client 2',
            'web',
            '[]'::jsonb,
            NOW() + INTERVAL '1 minute'
        );
        RAISE EXCEPTION 'FAILED: Duplicate token was allowed';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'SUCCESS: Token uniqueness constraint working correctly';
    END;
    
    -- Clean up test records
    DELETE FROM calendar_exports WHERE token LIKE 'test_token_%';
    
    RAISE NOTICE 'SUCCESS: Calendar exports table created and tested successfully!';
    RAISE NOTICE 'You can now use the Export & Share feature in your Social Calendar.';
END;
$$; 