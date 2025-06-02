-- Fix invalid UUID entries in clients table
-- This script will find and fix any clients with invalid UUID format

-- First, let's see what we have in the clients table
SELECT id, name, team FROM clients WHERE name = 'Unassigned';

-- Check if there are any tasks pointing to invalid client IDs
SELECT t.id, t.title, t.client_id 
FROM tasks t 
WHERE t.client_id IN ('unassigned-creative', 'unassigned-web');

-- If there are invalid entries, we need to:
-- 1. Create new proper UUID entries for unassigned clients
-- 2. Update tasks to point to the new UUIDs
-- 3. Delete the old invalid entries

-- Create new unassigned clients with proper UUIDs (only if they don't exist)
INSERT INTO clients (id, name, industry, contact_person, email, phone, team, date_added, created_at)
SELECT 
    gen_random_uuid(),
    'Unassigned',
    '',
    '',
    '',
    '',
    'creative',
    CURRENT_DATE,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM clients WHERE name = 'Unassigned' AND team = 'creative' AND id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

INSERT INTO clients (id, name, industry, contact_person, email, phone, team, date_added, created_at)
SELECT 
    gen_random_uuid(),
    'Unassigned',
    '',
    '',
    '',
    '',
    'web',
    CURRENT_DATE,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM clients WHERE name = 'Unassigned' AND team = 'web' AND id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Show the new unassigned clients
SELECT id, name, team FROM clients WHERE name = 'Unassigned' ORDER BY team; 