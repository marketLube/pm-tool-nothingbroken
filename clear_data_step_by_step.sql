-- Step-by-step data clearing script
-- Run each section separately in your Supabase SQL editor

-- Step 1: Check current data counts
SELECT 'Current Tasks:' as info, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'Current Clients:' as info, COUNT(*) as count FROM clients
UNION ALL
SELECT 'Current Reports:' as info, COUNT(*) as count FROM reports;

-- Step 2: Delete all tasks (run this after checking counts above)
-- DELETE FROM tasks;

-- Step 3: Verify tasks deletion
-- SELECT 'Tasks after deletion:' as info, COUNT(*) as count FROM tasks;

-- Step 4: Delete all clients (run this after tasks are deleted)
-- DELETE FROM clients;

-- Step 5: Verify clients deletion
-- SELECT 'Clients after deletion:' as info, COUNT(*) as count FROM clients;

-- Step 6: Delete all reports (run this after clients are deleted)
-- DELETE FROM reports;

-- Step 7: Final verification
-- SELECT 'Final Tasks:' as info, COUNT(*) as count FROM tasks
-- UNION ALL
-- SELECT 'Final Clients:' as info, COUNT(*) as count FROM clients
-- UNION ALL
-- SELECT 'Final Reports:' as info, COUNT(*) as count FROM reports; 