# 🚨 URGENT FIX: Calendar Export Issue

## The Problem
The "Failed to export calendar" error is happening because the `calendar_exports` table doesn't exist in your Supabase database.

## Quick Fix (2 minutes)

### Step 1: Go to Supabase Dashboard
1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **marketlube-pm-tool**
3. Go to **SQL Editor** in the left sidebar

### Step 2: Run This SQL Script
Copy and paste this EXACT script into the SQL Editor:

```sql
-- Setup Calendar Exports Table for Social/Project Calendar Sharing
-- This will fix the "Failed to export calendar" error

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
    created_by UUID NULL,
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
CREATE POLICY "authenticated_can_create_exports" ON calendar_exports
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "users_can_view_own_exports" ON calendar_exports
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        (created_by = auth.uid() OR created_by IS NULL)
    );

CREATE POLICY "public_can_view_valid_exports" ON calendar_exports
    FOR SELECT 
    USING (expires_at > NOW());

-- Grant permissions
GRANT ALL ON calendar_exports TO authenticated;
GRANT SELECT ON calendar_exports TO anon;

-- Test the setup
INSERT INTO calendar_exports (
    token,
    client_id, 
    client_name,
    team,
    tasks,
    expires_at
) VALUES (
    'test_token_setup',
    'test_client_id',
    'Test Client',
    'creative',
    '[]'::jsonb,
    NOW() + INTERVAL '1 minute'
);

-- Clean up test record
DELETE FROM calendar_exports WHERE token = 'test_token_setup';

-- Success message
SELECT 'Calendar exports table created successfully!' as result;
```

### Step 3: Click "Run" Button
- The script will create the table and show "Calendar exports table created successfully!"
- If you see any errors, copy them and let me know

### Step 4: Test Calendar Export
1. Go back to your PM Tool
2. Navigate to Social Calendar
3. Click "Export & Share" button
4. It should now work without the error!

## What This Fixes
- ✅ Creates the missing `calendar_exports` table
- ✅ Sets up proper permissions and security
- ✅ Enables calendar sharing functionality
- ✅ Fixes the "Failed to export calendar" error

## If You Still Get Errors
If you still see issues after running this script, check:
1. Make sure you're on the correct Supabase project
2. Check that the script ran without errors
3. Refresh your PM Tool page
4. Try the export again

Let me know once you've run this and I can help with any remaining issues! 