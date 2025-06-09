-- =====================================================
-- FIX USER DELETION WITH PROPER CASCADE HANDLING
-- =====================================================
-- This script ensures all user-related data is properly deleted
-- when a user is removed, including attendance records

-- =====================================================
-- 1. CHECK AND FIX FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop and recreate foreign key constraints with proper CASCADE
-- This ensures all user data is deleted when user is deleted

-- First, let's check existing constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users';

-- =====================================================
-- 2. FIX DAILY_WORK_ENTRIES TABLE
-- =====================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_work_entries_user_id_fkey'
        AND table_name = 'daily_work_entries'
    ) THEN
        ALTER TABLE daily_work_entries DROP CONSTRAINT daily_work_entries_user_id_fkey;
    END IF;
END $$;

-- Recreate with proper CASCADE
ALTER TABLE daily_work_entries 
ADD CONSTRAINT daily_work_entries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =====================================================
-- 3. FIX TASK_COMPLETIONS TABLE
-- =====================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'task_completions_user_id_fkey'
        AND table_name = 'task_completions'
    ) THEN
        ALTER TABLE task_completions DROP CONSTRAINT task_completions_user_id_fkey;
    END IF;
END $$;

-- Recreate with proper CASCADE
ALTER TABLE task_completions 
ADD CONSTRAINT task_completions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =====================================================
-- 4. FIX TASKS TABLE (assignee_id)
-- =====================================================

-- Handle tasks assigned to users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_assignee_id_fkey'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks DROP CONSTRAINT tasks_assignee_id_fkey;
    END IF;
END $$;

-- Recreate with SET NULL (tasks should remain but be unassigned)
ALTER TABLE tasks 
ADD CONSTRAINT tasks_assignee_id_fkey 
FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- 5. FIX MODULE_PERMISSIONS TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_permissions') THEN
        -- Drop existing constraints
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'module_permissions_user_id_fkey'
            AND table_name = 'module_permissions'
        ) THEN
            ALTER TABLE module_permissions DROP CONSTRAINT module_permissions_user_id_fkey;
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'module_permissions_granted_by_fkey'
            AND table_name = 'module_permissions'
        ) THEN
            ALTER TABLE module_permissions DROP CONSTRAINT module_permissions_granted_by_fkey;
        END IF;
        
        -- Recreate with proper CASCADE
        ALTER TABLE module_permissions 
        ADD CONSTRAINT module_permissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        ALTER TABLE module_permissions 
        ADD CONSTRAINT module_permissions_granted_by_fkey 
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 6. FIX USER_AUDIT_LOG TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_audit_log') THEN
        -- Drop existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_audit_log_performed_by_fkey'
            AND table_name = 'user_audit_log'
        ) THEN
            ALTER TABLE user_audit_log DROP CONSTRAINT user_audit_log_performed_by_fkey;
        END IF;
        
        -- Check if performed_by column is text type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_audit_log' 
            AND column_name = 'performed_by' 
            AND data_type = 'text'
        ) THEN
            -- For text columns, we can't create a foreign key to UUID
            -- Instead, we'll handle cleanup in the deletion function
            RAISE NOTICE 'user_audit_log.performed_by is text type - skipping foreign key constraint';
        ELSE
            -- If it's UUID type, create the foreign key
            ALTER TABLE user_audit_log 
            ADD CONSTRAINT user_audit_log_performed_by_fkey 
            FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 7. CREATE ENHANCED DELETE USER FUNCTION
-- =====================================================

-- Create a function to safely delete a user with comprehensive cleanup
CREATE OR REPLACE FUNCTION delete_user_with_cleanup(
    target_user_id UUID,
    performed_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    target_user RECORD;
    performer RECORD;
    deleted_data JSONB;
BEGIN
    -- Get target user information
    SELECT * INTO target_user FROM users WHERE id = target_user_id;
    
    IF target_user IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get performer information if provided
    IF performed_by_user_id IS NOT NULL THEN
        SELECT * INTO performer FROM users WHERE id = performed_by_user_id;
        
        -- Check permissions
        IF performer IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Performer not found'
            );
        END IF;
        
        -- Role hierarchy check
        IF performer.role = 'admin' AND target_user.role = 'super_admin' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Admins cannot delete Super Admin users'
            );
        END IF;
        
        IF performer.role NOT IN ('admin', 'super_admin') THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient permissions to delete users'
            );
        END IF;
    END IF;
    
    -- Collect information about data that will be deleted
    SELECT jsonb_build_object(
        'user_info', to_jsonb(target_user),
        'daily_work_entries', (
            SELECT COUNT(*) FROM daily_work_entries WHERE user_id = target_user_id
        ),
        'task_completions', (
            SELECT COUNT(*) FROM task_completions WHERE user_id = target_user_id
        ),
        'assigned_tasks', (
            SELECT COUNT(*) FROM tasks WHERE assignee_id = target_user_id
        ),
        'module_permissions', (
            SELECT COUNT(*) FROM module_permissions 
            WHERE user_id = target_user_id OR granted_by = target_user_id
        )
    ) INTO deleted_data;
    
    -- Log the deletion attempt
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_audit_log') THEN
        INSERT INTO user_audit_log (
            user_id,
            action,
            old_values,
            performed_by,
            timestamp,
            metadata
        ) VALUES (
            target_user_id::TEXT,
            'USER_DELETION_INITIATED',
            to_jsonb(target_user),
            performed_by_user_id::TEXT,
            NOW(),
            jsonb_build_object(
                'deletion_data', deleted_data,
                'performer_role', COALESCE(performer.role, 'system')
            )
        );
    END IF;
    
    -- Perform the deletion (CASCADE will handle related data)
    DELETE FROM users WHERE id = target_user_id;
    
    -- Log successful deletion
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_audit_log') THEN
        INSERT INTO user_audit_log (
            user_id,
            action,
            old_values,
            performed_by,
            timestamp,
            metadata
        ) VALUES (
            target_user_id::TEXT,
            'USER_DELETED_SUCCESSFULLY',
            to_jsonb(target_user),
            performed_by_user_id::TEXT,
            NOW(),
            jsonb_build_object(
                'deleted_data', deleted_data,
                'performer_role', COALESCE(performer.role, 'system')
            )
        );
        
        -- Clean up audit logs where performed_by matches the deleted user (text comparison)
        UPDATE user_audit_log 
        SET performed_by = NULL, 
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('original_performer_deleted', true)
        WHERE performed_by = target_user_id::TEXT;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User deleted successfully',
        'deleted_user', target_user.name,
        'deleted_data', deleted_data
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_audit_log') THEN
        INSERT INTO user_audit_log (
            user_id,
            action,
            old_values,
            performed_by,
            timestamp,
            metadata
        ) VALUES (
            target_user_id::TEXT,
            'USER_DELETION_FAILED',
            to_jsonb(target_user),
            performed_by_user_id::TEXT,
            NOW(),
            jsonb_build_object(
                'error', SQLERRM,
                'error_code', SQLSTATE,
                'performer_role', COALESCE(performer.role, 'system')
            )
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION delete_user_with_cleanup(UUID, UUID) TO authenticated;

-- =====================================================
-- 9. UPDATE RLS POLICIES FOR USER DELETION
-- =====================================================

-- Ensure the original RLS policy is in place
DROP POLICY IF EXISTS "Role-based user deletion policy" ON users;

CREATE POLICY "Role-based user deletion policy" ON users
    FOR DELETE 
    USING (
        -- Super Admin can delete anyone
        EXISTS (
            SELECT 1 FROM users AS deleter_user
            WHERE deleter_user.id = auth.uid()
            AND deleter_user.role = 'super_admin'
            AND deleter_user.is_active = true
        )
        OR
        -- Admin can delete anyone except Super Admins
        (
            EXISTS (
                SELECT 1 FROM users AS deleter_user
                WHERE deleter_user.id = auth.uid()
                AND deleter_user.role = 'admin'
                AND deleter_user.is_active = true
            )
            AND
            -- Target user is not a Super Admin
            role != 'super_admin'
        )
    );

-- =====================================================
-- 10. VERIFICATION AND TESTING
-- =====================================================

-- Show current foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    rc.delete_rule
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

-- Show success message
SELECT 'User deletion cascade setup completed! All user-related data will be properly cleaned up when a user is deleted.' as status;

-- Add comments for documentation
COMMENT ON FUNCTION delete_user_with_cleanup(UUID, UUID) IS 'Safely deletes a user with comprehensive cleanup and audit logging. Includes role-based permission checking.';
COMMENT ON POLICY "Role-based user deletion policy" ON users IS 'Updated policy: Super Admin can delete anyone, Admin can delete anyone except Super Admins'; 