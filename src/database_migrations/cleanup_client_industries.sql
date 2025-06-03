-- Cleanup script for client industries
-- Remove 'travel' industry from Westbird and clean up all industry fields since they're deprecated

BEGIN;

-- Clear industry field for Westbird client specifically
UPDATE clients 
SET industry = '' 
WHERE name = 'Westbird' AND industry = 'travel';

-- Optional: Clear all industry fields since the feature is deprecated
-- Uncomment the line below if you want to clear all existing industry data
-- UPDATE clients SET industry = '';

-- Verify the changes
SELECT id, name, industry, team 
FROM clients 
WHERE name = 'Westbird' OR industry IS NOT NULL OR industry != '';

COMMIT; 