-- Fix for calendar_exports foreign key constraint issue
-- This script makes the created_by field properly nullable and fixes the constraint

-- First, check if the table exists and has data
DO $$
BEGIN
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'calendar_exports_created_by_fkey' 
        AND table_name = 'calendar_exports'
    ) THEN
        ALTER TABLE calendar_exports DROP CONSTRAINT calendar_exports_created_by_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint';
    END IF;
END $$;

-- Make sure the created_by column allows NULL values
ALTER TABLE calendar_exports ALTER COLUMN created_by DROP NOT NULL;

-- Add a new foreign key constraint that properly handles NULLs
ALTER TABLE calendar_exports 
ADD CONSTRAINT calendar_exports_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Update the RLS policy to handle NULL created_by values
DROP POLICY IF EXISTS "Users can create their own exports" ON calendar_exports;
DROP POLICY IF EXISTS "Users can view their own exports" ON calendar_exports;

-- New policy for authenticated users to create exports
CREATE POLICY "Authenticated users can create exports" ON calendar_exports
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- New policy for authenticated users to view their own exports (if created_by is not null)
-- Also allow viewing if created_by is null (for backwards compatibility)
CREATE POLICY "Users can view accessible exports" ON calendar_exports
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            created_by IS NULL OR 
            auth.uid() = created_by
        )
    );

-- Keep the public policy for non-expired exports
-- (This should already exist from the original script)

COMMENT ON TABLE calendar_exports IS 'Stores exported calendar data with shareable tokens. created_by can be NULL for system-generated exports.';

-- Show the current structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_exports' 
AND table_schema = 'public'
ORDER BY ordinal_position; 