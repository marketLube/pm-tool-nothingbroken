-- Migration: Simplify Clients Table - Updated Version
-- This migration makes client name and team fields required, other fields optional
-- Execute this in your Supabase SQL Editor

-- Step 1: Add team column if it doesn't exist (for older setups)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'creative' CHECK (team IN ('creative', 'web'));

-- Step 2: Make other fields optional with sensible defaults
-- Update existing NULL values to empty strings for optional fields
UPDATE clients 
SET 
  industry = COALESCE(industry, ''),
  contact_person = COALESCE(contact_person, ''),
  email = COALESCE(email, ''),
  phone = COALESCE(phone, ''),
  team = COALESCE(team, 'creative')  -- Ensure all existing clients have a team
WHERE 
  industry IS NULL OR 
  contact_person IS NULL OR 
  email IS NULL OR 
  phone IS NULL OR
  team IS NULL;

-- Step 3: Add default values for optional fields
ALTER TABLE clients 
  ALTER COLUMN industry SET DEFAULT '',
  ALTER COLUMN contact_person SET DEFAULT '',
  ALTER COLUMN email SET DEFAULT '',
  ALTER COLUMN phone SET DEFAULT '';

-- Step 4: Remove NOT NULL constraints on optional fields (if they exist)
-- Note: This might fail if constraints don't exist, which is fine
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE clients ALTER COLUMN industry DROP NOT NULL;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE clients ALTER COLUMN contact_person DROP NOT NULL;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE clients ALTER COLUMN phone DROP NOT NULL;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- Step 5: Ensure required fields are properly set
-- name and team should remain/become NOT NULL
ALTER TABLE clients ALTER COLUMN name SET NOT NULL;
ALTER TABLE clients ALTER COLUMN team SET NOT NULL;

-- Step 6: Add constraint to ensure team has valid values
-- Drop existing constraint if it exists and recreate
DO $$
BEGIN
    BEGIN
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_team_check;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
END $$;

ALTER TABLE clients ADD CONSTRAINT clients_team_check CHECK (team IN ('creative', 'web'));

-- Step 7: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'clients'
ORDER BY ordinal_position; 