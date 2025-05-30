-- =====================================================
-- FIX USER AUTHENTICATION SYSTEM
-- =====================================================
-- This script addresses the disconnect between custom users table and Supabase Auth

-- =====================================================
-- 1. UNDERSTANDING THE PROBLEM
-- =====================================================
-- Current Issue:
-- - App stores users in custom 'users' table
-- - Only althameem@marketlube.in exists in auth.users (Supabase Auth)
-- - Other users can't sign in because they're not in Supabase Auth
-- 
-- Solution Options:
-- A) Migrate existing users to Supabase Auth (RECOMMENDED)
-- B) Continue with custom auth but fix the login flow
-- C) Hybrid approach

-- =====================================================
-- 2. OPTION A: MIGRATE TO PROPER SUPABASE AUTH (RECOMMENDED)
-- =====================================================

-- First, let's see what users exist in the custom table
SELECT 
    id,
    name,
    email,
    role,
    team,
    is_active,
    created_at
FROM users 
WHERE is_active = true
ORDER BY created_at;

-- =====================================================
-- 3. CREATE FUNCTION TO MIGRATE USERS TO SUPABASE AUTH
-- =====================================================

-- Note: This function would need to be called via API since we can't directly
-- create auth.users entries from SQL. The actual user creation should be done
-- from your application using Supabase Admin SDK.

-- Function to prepare user data for migration
CREATE OR REPLACE FUNCTION get_users_for_auth_migration()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    password TEXT,
    role TEXT,
    team TEXT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.password,
        u.role,
        u.team,
        jsonb_build_object(
            'name', u.name,
            'role', u.role,
            'team', u.team,
            'avatar', u.avatar,
            'join_date', u.join_date,
            'allowed_statuses', u.allowed_statuses
        ) as metadata
    FROM users u
    WHERE u.is_active = true
    AND u.email != 'althameem@marketlube.in'; -- Skip admin as they already exist
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. OPTION B: FIX CUSTOM AUTH SYSTEM
-- =====================================================

-- If you prefer to continue with custom auth, we need to fix the RLS policies
-- to allow the custom authentication to work properly

-- Temporarily disable RLS for users table to allow custom auth
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Or create more permissive policies for custom auth
-- (Re-enable RLS first if you want policies)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;
DROP POLICY IF EXISTS "Anonymous users can read users for login" ON users;

-- Create policies that allow custom authentication
CREATE POLICY "Allow login credential checks" ON users
    FOR SELECT 
    USING (true); -- Allow all reads for login verification

CREATE POLICY "Allow authenticated user operations" ON users
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 5. CREATE HELPER FUNCTION FOR LOGIN VERIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION verify_user_credentials(
    user_email TEXT,
    user_password TEXT
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    email TEXT,
    role TEXT,
    team TEXT,
    is_active BOOLEAN,
    allowed_statuses TEXT[],
    avatar TEXT,
    join_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.team,
        u.is_active,
        u.allowed_statuses,
        u.avatar,
        u.join_date
    FROM users u
    WHERE u.email = user_email 
    AND u.password = user_password
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREATE FUNCTION TO LIST ALL ACTIVE USERS FOR DEBUGGING
-- =====================================================

CREATE OR REPLACE FUNCTION debug_user_authentication()
RETURNS TABLE (
    custom_table_users INTEGER,
    auth_users INTEGER,
    users_needing_auth_creation TEXT[]
) AS $$
DECLARE
    custom_count INTEGER;
    auth_count INTEGER;
    missing_users TEXT[];
BEGIN
    -- Count users in custom table
    SELECT COUNT(*) INTO custom_count
    FROM users 
    WHERE is_active = true;
    
    -- Count users in auth.users (this might fail if we don't have access)
    BEGIN
        SELECT COUNT(*) INTO auth_count
        FROM auth.users;
    EXCEPTION WHEN OTHERS THEN
        auth_count := -1; -- Indicates we can't access auth.users
    END;
    
    -- Get list of users that need auth account creation
    SELECT ARRAY_AGG(email) INTO missing_users
    FROM users u
    WHERE u.is_active = true
    AND u.email != 'althameem@marketlube.in';
    
    RETURN QUERY SELECT custom_count, auth_count, missing_users;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. RUN DIAGNOSTIC
-- =====================================================

-- Check current state
SELECT * FROM debug_user_authentication();

-- List all active users that need authentication setup
SELECT 
    email,
    name,
    role,
    team,
    'Needs Supabase Auth account' as status
FROM users 
WHERE is_active = true
AND email != 'althameem@marketlube.in'
ORDER BY created_at;

-- =====================================================
-- 8. IMMEDIATE FIX: GRANT PERMISSIONS FOR CUSTOM AUTH
-- =====================================================

-- Ensure the anon role can read users for login verification
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;

-- =====================================================
-- 9. INSTRUCTIONS FOR NEXT STEPS
-- =====================================================

/*
NEXT STEPS TO COMPLETELY FIX AUTHENTICATION:

OPTION A - MIGRATE TO SUPABASE AUTH (RECOMMENDED):
1. Create a Node.js script using Supabase Admin SDK
2. For each user from get_users_for_auth_migration():
   - Create auth user with: supabase.auth.admin.createUser()
   - Set user metadata with role, team, etc.
3. Update your AuthContext to use Supabase Auth
4. Link custom users table to auth.users via foreign key

OPTION B - CONTINUE WITH CUSTOM AUTH:
1. The SQL above should fix immediate login issues
2. Update your authentication to use verify_user_credentials()
3. Consider security implications of custom auth

IMMEDIATE TEST:
1. Run this SQL script in Supabase
2. Try logging in with any user from your users table
3. Check browser console for detailed error messages
*/

-- Show completion message
SELECT 'Authentication fix script completed! Check the instructions above for next steps.' as message; 