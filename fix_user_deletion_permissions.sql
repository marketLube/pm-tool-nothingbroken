-- =====================================================
-- FIX USER DELETION PERMISSIONS - ROLE HIERARCHY
-- =====================================================
-- This script fixes the Row Level Security policies to properly
-- implement role-based user deletion permissions

-- =====================================================
-- 1. ENSURE PROPER RLS POLICIES FOR USERS TABLE
-- =====================================================

-- Drop existing potentially restrictive policies
DROP POLICY IF EXISTS "Authenticated users can delete users" ON users;
DROP POLICY IF EXISTS "Users can delete own data" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Super Admin can delete users" ON users;

-- =====================================================
-- 2. CREATE ROLE-BASED DELETION POLICY
-- =====================================================

-- Create a comprehensive delete policy that implements role hierarchy
CREATE POLICY "Role-based user deletion policy" ON users
    FOR DELETE 
    USING (
        -- Super Admin can delete anyone (including other super admins)
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
-- 3. CREATE FUNCTION TO CHECK USER DELETION PERMISSIONS
-- =====================================================

-- Create a function to validate deletion permissions
CREATE OR REPLACE FUNCTION can_delete_user(
    deleter_id UUID,
    target_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    deleter_role TEXT;
    target_role TEXT;
    deleter_active BOOLEAN;
BEGIN
    -- Get deleter's role and status
    SELECT role, is_active 
    INTO deleter_role, deleter_active
    FROM users 
    WHERE id = deleter_id;
    
    -- Get target user's role
    SELECT role 
    INTO target_role
    FROM users 
    WHERE id = target_user_id;
    
    -- Check if deleter exists and is active
    IF deleter_role IS NULL OR NOT deleter_active THEN
        RETURN FALSE;
    END IF;
    
    -- Check if target user exists
    IF target_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Super Admin can delete anyone
    IF deleter_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Admin can delete anyone except Super Admins
    IF deleter_role = 'admin' AND target_role != 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- All other cases: no permission
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Ensure authenticated users can use the function
GRANT EXECUTE ON FUNCTION can_delete_user(UUID, UUID) TO authenticated;

-- =====================================================
-- 5. CREATE AUDIT LOG FOR USER DELETIONS
-- =====================================================

-- Create trigger function to log user deletions
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the deletion to user_audit_log if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_audit_log') THEN
        INSERT INTO user_audit_log (
            user_id,
            action,
            old_values,
            performed_by,
            timestamp,
            metadata
        ) VALUES (
            OLD.id::TEXT,
            'USER_DELETED',
            to_jsonb(OLD),
            auth.uid()::TEXT,
            NOW(),
            jsonb_build_object(
                'deleted_user_name', OLD.name,
                'deleted_user_email', OLD.email,
                'deleted_user_role', OLD.role
            )
        );
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS user_deletion_audit_trigger ON users;
CREATE TRIGGER user_deletion_audit_trigger
    BEFORE DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_user_deletion();

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Check current policies on users table
SELECT 
    policyname,
    cmd,
    qual as "using_clause",
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'DELETE';

-- Test the permission function
-- (Replace with actual user IDs to test)
-- SELECT can_delete_user('super_admin_id', 'target_user_id') as can_delete;

COMMENT ON FUNCTION can_delete_user(UUID, UUID) IS 'Checks if a user has permission to delete another user based on role hierarchy';
COMMENT ON POLICY "Role-based user deletion policy" ON users IS 'Implements role hierarchy: Super Admin can delete anyone, Admin can delete anyone except Super Admins';

-- Show success message
SELECT 'User deletion permissions have been fixed! Super Admins can delete anyone, Admins can delete anyone except Super Admins.' as status; 