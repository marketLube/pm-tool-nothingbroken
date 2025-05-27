-- Clear all existing data from the database
-- Run this script in your Supabase SQL editor

-- Delete all tasks first (due to foreign key constraints)
DELETE FROM tasks;

-- Delete all clients
DELETE FROM clients;

-- Delete all reports (if they exist)
DELETE FROM reports;

-- Reset any auto-increment sequences if needed
-- Note: Supabase uses UUIDs by default, so this might not be necessary
-- But if you have any serial/auto-increment columns, you can reset them like this:
-- ALTER SEQUENCE tasks_id_seq RESTART WITH 1;
-- ALTER SEQUENCE clients_id_seq RESTART WITH 1;

-- Verify deletion
SELECT 'Tasks remaining:' as table_name, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'Clients remaining:' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'Reports remaining:' as table_name, COUNT(*) as count FROM reports; 