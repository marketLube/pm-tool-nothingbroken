-- =====================================================
-- DIAGNOSE USER DELETION ISSUE
-- =====================================================
-- This script helps identify what's preventing user deletion
-- Replace 'USER_ID_HERE' with Fidal's actual user ID

-- =====================================================
-- 1. CHECK CURRENT FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- =====================================================
-- 2. CHECK WHAT DATA EXISTS FOR A SPECIFIC USER
-- =====================================================

-- Fidal's user ID: 3de8309d-e09a-40a9-a53d-6be44c6df5ae

-- Check daily_work_entries
SELECT 'daily_work_entries' as table_name, COUNT(*) as record_count
FROM daily_work_entries 
WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'

UNION ALL

-- Check task_completions
SELECT 'task_completions' as table_name, COUNT(*) as record_count
FROM task_completions 
WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'

UNION ALL

-- Check tasks (assigned to user)
SELECT 'tasks_assigned' as table_name, COUNT(*) as record_count
FROM tasks 
WHERE assignee_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'

UNION ALL

-- Check tasks (created by user)
SELECT 'tasks_created' as table_name, COUNT(*) as record_count
FROM tasks 
WHERE created_by = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'

UNION ALL

-- Check module_permissions (if table exists)
SELECT 'module_permissions_user' as table_name, COUNT(*) as record_count
FROM module_permissions 
WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'

UNION ALL

-- Check module_permissions (granted by user)
SELECT 'module_permissions_granted' as table_name, COUNT(*) as record_count
FROM module_permissions 
WHERE granted_by = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'

UNION ALL

-- Check user_audit_log (performed by user)
SELECT 'user_audit_log' as table_name, COUNT(*) as record_count
FROM user_audit_log 
WHERE performed_by = '3de8309d-e09a-40a9-a53d-6be44c6df5ae';

-- =====================================================
-- 3. GET USER INFORMATION
-- =====================================================

-- Get the user details
SELECT 
    id,
    name,
    email,
    role,
    team,
    is_active,
    join_date
FROM users 
WHERE name ILIKE '%fidal%' OR email ILIKE '%fidal%';

-- =====================================================
-- 4. CHECK FOR ANY OTHER TABLES REFERENCING USERS
-- =====================================================

-- This query finds all tables that reference the users table
SELECT DISTINCT
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =====================================================
-- 5. SAFE DELETE ATTEMPT WITH DETAILED ERROR INFO
-- =====================================================

-- This will show exactly which constraint is failing
-- Using Fidal's actual user ID

DO $$
DECLARE
    user_id_to_delete UUID := '3de8309d-e09a-40a9-a53d-6be44c6df5ae';  -- Fidal's ID
    constraint_error TEXT;
BEGIN
    -- Try to delete the user
    DELETE FROM users WHERE id = user_id_to_delete;
    
    RAISE NOTICE 'User deleted successfully!';
    
EXCEPTION 
    WHEN foreign_key_violation THEN
        GET STACKED DIAGNOSTICS constraint_error = CONSTRAINT_NAME;
        RAISE NOTICE 'Foreign key constraint violation: %', constraint_error;
        RAISE NOTICE 'Error details: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Other error: % (Code: %)', SQLERRM, SQLSTATE;
END $$;

-- =====================================================
-- 6. EMERGENCY CASCADE FIX (IF NEEDED)
-- =====================================================

-- If constraints are still not CASCADE, this will fix them
-- Uncomment and run this section if needed:

/*
-- Fix daily_work_entries
ALTER TABLE daily_work_entries DROP CONSTRAINT IF EXISTS daily_work_entries_user_id_fkey CASCADE;
ALTER TABLE daily_work_entries ADD CONSTRAINT daily_work_entries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fix task_completions
ALTER TABLE task_completions DROP CONSTRAINT IF EXISTS task_completions_user_id_fkey CASCADE;
ALTER TABLE task_completions ADD CONSTRAINT task_completions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fix tasks assignee
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey 
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

-- Fix tasks created_by (if this column exists and has a constraint)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
*/ 