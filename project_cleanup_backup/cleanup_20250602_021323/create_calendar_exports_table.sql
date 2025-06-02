-- Create calendar_exports table for storing exported calendar data
CREATE TABLE IF NOT EXISTS calendar_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    client_id UUID NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    team VARCHAR(50) NOT NULL,
    tasks JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Links expire after 45 days
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_exports_token ON calendar_exports(token);
CREATE INDEX IF NOT EXISTS idx_calendar_exports_client_id ON calendar_exports(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_exports_expires_at ON calendar_exports(expires_at);
CREATE INDEX IF NOT EXISTS idx_calendar_exports_created_by ON calendar_exports(created_by);

-- Enable RLS (Row Level Security)
ALTER TABLE calendar_exports ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to create exports (only their own)
CREATE POLICY "Users can create their own exports" ON calendar_exports
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy for authenticated users to view their own exports
CREATE POLICY "Users can view their own exports" ON calendar_exports
    FOR SELECT USING (auth.uid() = created_by);

-- Policy for public access to non-expired exports (for client viewing)
CREATE POLICY "Public can view non-expired exports" ON calendar_exports
    FOR SELECT USING (expires_at > NOW());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_calendar_exports_updated_at
    BEFORE UPDATE ON calendar_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_exports_updated_at();

-- Function to clean up expired exports (run periodically)
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

-- Grant necessary permissions
GRANT ALL ON calendar_exports TO authenticated;
GRANT SELECT ON calendar_exports TO anon; -- For public viewing of exports 