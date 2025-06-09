-- Fix the users_team_check constraint to allow 'all' as a valid team value
-- Run this in your Supabase SQL editor

-- First, drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;

-- Add the new constraint that includes 'all'
ALTER TABLE users ADD CONSTRAINT users_team_check 
CHECK (team IN ('creative', 'web', 'all'));

-- Verify the constraint was added
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_team_check'; 