-- Cleanup script for clients table
-- 1. Remove unassigned clients from both teams
-- 2. Remove ABC Corporation duplicates
-- 3. Add unique constraint to prevent duplicate names within same team

BEGIN;

-- First, let's see what we're working with
SELECT 'Current unassigned clients:' as info;
SELECT id, name, team, date_added FROM clients WHERE name = 'Unassigned';

SELECT 'Current ABC Corporation entries:' as info;
SELECT id, name, team, date_added FROM clients WHERE name ILIKE '%ABC%Corporation%';

-- Move any tasks from unassigned clients to null (we'll handle this differently)
-- This is safer than deleting the client with active tasks
UPDATE tasks 
SET client_id = NULL 
WHERE client_id IN (
  SELECT id FROM clients WHERE name = 'Unassigned'
);

-- Delete all unassigned clients
DELETE FROM clients WHERE name = 'Unassigned';

-- Keep only the oldest ABC Corporation for each team
WITH abc_clients AS (
  SELECT id, name, team, date_added,
         ROW_NUMBER() OVER (PARTITION BY team ORDER BY date_added ASC) as rn
  FROM clients 
  WHERE name ILIKE '%ABC%Corporation%'
),
duplicates_to_delete AS (
  SELECT id FROM abc_clients WHERE rn > 1
)
-- Move tasks from duplicate ABC Corporation clients to the oldest one in same team
UPDATE tasks 
SET client_id = (
  SELECT id FROM abc_clients WHERE rn = 1 AND team = (
    SELECT team FROM clients WHERE id = tasks.client_id
  )
)
WHERE client_id IN (SELECT id FROM duplicates_to_delete);

-- Delete duplicate ABC Corporation clients
DELETE FROM clients 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY team ORDER BY date_added ASC) as rn
    FROM clients 
    WHERE name ILIKE '%ABC%Corporation%'
  ) ranked_clients 
  WHERE rn > 1
);

-- Add unique constraint to prevent duplicate client names within same team
-- First check if constraint already exists
DO $$ 
BEGIN
    -- Try to add the constraint
    ALTER TABLE clients 
    ADD CONSTRAINT unique_client_name_per_team 
    UNIQUE (name, team);
    
    RAISE NOTICE 'Added unique constraint for client names per team';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Unique constraint already exists';
    WHEN others THEN
        RAISE NOTICE 'Could not add constraint: %', SQLERRM;
END $$;

-- Show final state
SELECT 'Final client list:' as info;
SELECT id, name, team, date_added FROM clients ORDER BY team, name;

COMMIT; 