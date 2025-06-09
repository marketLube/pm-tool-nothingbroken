-- =====================================================
-- FIX CREATED_BY NOT NULL CONSTRAINT ISSUE
-- =====================================================
-- This fixes the "null value in column 'created_by' violates not-null constraint" error

-- =====================================================
-- OPTION 1: MAKE CREATED_BY NULLABLE (RECOMMENDED)
-- =====================================================

-- Make the created_by column nullable so users can be deleted
ALTER TABLE tasks ALTER COLUMN created_by DROP NOT NULL;

-- Now update the foreign key constraint to SET NULL
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- ALSO CHECK AND FIX ASSIGNEE_ID IF IT HAS SAME ISSUE
-- =====================================================

-- Make assignee_id nullable too (in case it has the same issue)
ALTER TABLE tasks ALTER COLUMN assignee_id DROP NOT NULL;

-- Update the foreign key constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey 
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- NOW TRY TO DELETE FIDAL AGAIN
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
        
    WHEN check_violation THEN
        RAISE NOTICE 'CHECK CONSTRAINT VIOLATION: %', SQLERRM;
        
    WHEN not_null_violation THEN
        RAISE NOTICE 'NOT NULL CONSTRAINT VIOLATION: %', SQLERRM;
        
    WHEN OTHERS THEN
        RAISE NOTICE 'Other error: % (Code: %)', SQLERRM, SQLSTATE;
END $$;

-- =====================================================
-- CHECK CURRENT COLUMN CONSTRAINTS
-- =====================================================

-- Show current constraints on tasks table
SELECT 
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
    AND table_schema = 'public'
    AND column_name IN ('created_by', 'assignee_id')
ORDER BY column_name;

-- =====================================================
-- VERIFY FOREIGN KEY CONSTRAINTS
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
    AND tc.table_name = 'tasks'
    AND ccu.table_name = 'users'
ORDER BY kcu.column_name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Fixed NOT NULL constraint issue. User deletion should now work!' as status; 