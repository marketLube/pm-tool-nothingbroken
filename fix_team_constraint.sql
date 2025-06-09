-- Fix team constraint to allow 'all' as a valid team value
-- This allows Admin users to be assigned to "All Teams"

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;

-- Add the new constraint that includes 'all'
ALTER TABLE users ADD CONSTRAINT users_team_check 
  CHECK (team IN ('creative', 'web', 'all'));

-- Update existing admin users to use 'all' team if desired
-- (Optional - only run if you want to update existing admins)
-- UPDATE users 
-- SET team = 'all' 
-- WHERE role = 'admin'; 