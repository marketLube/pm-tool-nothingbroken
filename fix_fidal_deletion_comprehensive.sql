-- =====================================================
-- COMPREHENSIVE FIX FOR USER DELETION - ALL TABLES
-- =====================================================
-- This script fixes ALL foreign key constraints to allow proper user deletion
-- Based on the diagnostic results showing these referencing tables:
-- daily_work_entries, module_permissions, reports, task_completions, tasks, user_rollover

-- =====================================================
-- 1. FIX DAILY_WORK_ENTRIES (CASCADE - delete attendance when user deleted)
-- =====================================================

ALTER TABLE daily_work_entries DROP CONSTRAINT IF EXISTS daily_work_entries_user_id_fkey CASCADE;
ALTER TABLE daily_work_entries ADD CONSTRAINT daily_work_entries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =====================================================
-- 2. FIX MODULE_PERMISSIONS (CASCADE for user_id, SET NULL for granted_by)
-- =====================================================

-- Drop existing constraints
ALTER TABLE module_permissions DROP CONSTRAINT IF EXISTS module_permissions_user_id_fkey CASCADE;
ALTER TABLE module_permissions DROP CONSTRAINT IF EXISTS module_permissions_granted_by_fkey CASCADE;

-- Recreate with proper rules
ALTER TABLE module_permissions ADD CONSTRAINT module_permissions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE module_permissions ADD CONSTRAINT module_permissions_granted_by_fkey 
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- 3. FIX REPORTS (CASCADE - delete reports when user deleted)
-- =====================================================

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_fkey CASCADE;
ALTER TABLE reports ADD CONSTRAINT reports_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =====================================================
-- 4. FIX TASK_COMPLETIONS (CASCADE - delete completions when user deleted)
-- =====================================================

ALTER TABLE task_completions DROP CONSTRAINT IF EXISTS task_completions_user_id_fkey CASCADE;
ALTER TABLE task_completions ADD CONSTRAINT task_completions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =====================================================
-- 5. FIX TASKS (SET NULL - keep tasks but remove user references)
-- =====================================================

-- Drop existing constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey CASCADE;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey CASCADE;

-- Recreate with SET NULL (keep tasks but remove user references)
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey 
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- 6. FIX USER_ROLLOVER (CASCADE - delete rollover data when user deleted)
-- =====================================================

ALTER TABLE user_rollover DROP CONSTRAINT IF EXISTS user_rollover_user_id_fkey CASCADE;
ALTER TABLE user_rollover ADD CONSTRAINT user_rollover_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =====================================================
-- 7. VERIFY ALL CONSTRAINTS ARE PROPERLY SET
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
-- 8. NOW TRY TO DELETE FIDAL SAFELY
-- =====================================================

DO $$
DECLARE
    user_id_to_delete UUID := '3de8309d-e09a-40a9-a53d-6be44c6df5ae';  -- Fidal's ID
    constraint_error TEXT;
    deleted_data JSONB;
BEGIN
    -- Get user data before deletion for logging
    SELECT to_jsonb(u.*) INTO deleted_data
    FROM users u 
    WHERE id = user_id_to_delete;
    
    -- Try to delete the user
    DELETE FROM users WHERE id = user_id_to_delete;
    
    RAISE NOTICE 'SUCCESS! User Fidal deleted successfully!';
    RAISE NOTICE 'Deleted user data: %', deleted_data;
    
EXCEPTION 
    WHEN foreign_key_violation THEN
        GET STACKED DIAGNOSTICS constraint_error = CONSTRAINT_NAME;
        RAISE NOTICE 'STILL FAILING - Foreign key constraint violation: %', constraint_error;
        RAISE NOTICE 'Error details: %', SQLERRM;
        
        -- Show what data still exists
        RAISE NOTICE 'Checking remaining data...';
        
    WHEN OTHERS THEN
        RAISE NOTICE 'Other error: % (Code: %)', SQLERRM, SQLSTATE;
END $$;

-- =====================================================
-- 9. CHECK WHAT DATA REMAINS FOR FIDAL (IF DELETION FAILED)
-- =====================================================

-- This will show if there's still data preventing deletion
SELECT 'daily_work_entries' as table_name, COUNT(*) as record_count
FROM daily_work_entries WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'
UNION ALL
SELECT 'module_permissions_user' as table_name, COUNT(*) as record_count
FROM module_permissions WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'
UNION ALL
SELECT 'module_permissions_granted' as table_name, COUNT(*) as record_count
FROM module_permissions WHERE granted_by = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'
UNION ALL
SELECT 'reports' as table_name, COUNT(*) as record_count
FROM reports WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'
UNION ALL
SELECT 'task_completions' as table_name, COUNT(*) as record_count
FROM task_completions WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'
UNION ALL
SELECT 'tasks_assigned' as table_name, COUNT(*) as record_count
FROM tasks WHERE assignee_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'
UNION ALL
SELECT 'tasks_created' as table_name, COUNT(*) as record_count
FROM tasks WHERE created_by = '3de8309d-e09a-40a9-a53d-6be44c6df5ae'
UNION ALL
SELECT 'user_rollover' as table_name, COUNT(*) as record_count
FROM user_rollover WHERE user_id = '3de8309d-e09a-40a9-a53d-6be44c6df5ae';

-- =====================================================
-- 10. SUCCESS MESSAGE
-- =====================================================

SELECT 'All foreign key constraints have been fixed! User deletion should now work properly.' as status; 