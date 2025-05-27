-- Fix clients table by adding missing team column
-- This script adds the team column and sets default values for existing clients

-- Add the team column to the clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS team VARCHAR(20) DEFAULT 'creative';

-- Update existing clients to have a team assigned
-- Since we don't know which team they should belong to, we'll assign them to creative team
-- You can manually update specific clients to 'web' team if needed
UPDATE clients 
SET team = 'creative' 
WHERE team IS NULL OR team = '';

-- Verify the changes
SELECT id, name, team FROM clients ORDER BY name; 