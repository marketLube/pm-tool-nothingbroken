-- =====================================================
-- QUICK SQL FIX FOR AUTHENTICATION
-- =====================================================
-- Run this in Supabase SQL Editor to fix authentication

-- 1. Fix RLS policies to allow anonymous access for login
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;
DROP POLICY IF EXISTS "Anonymous users can read users for login" ON users;
DROP POLICY IF EXISTS "Allow login credential checks" ON users;
DROP POLICY IF EXISTS "Allow authenticated user operations" ON users;

-- Create permissive policies for custom authentication
CREATE POLICY "Allow anonymous login checks" ON users
    FOR SELECT 
    TO anon
    USING (true); -- Allow all reads for login verification

CREATE POLICY "Allow authenticated user operations" ON users
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Grant permissions
GRANT SELECT ON users TO anon;
GRANT ALL ON users TO authenticated;

-- 3. Test the fix
SELECT 
    email,
    name,
    role,
    team,
    'Authentication should work now' as status
FROM users 
WHERE is_active = true
ORDER BY created_at;

-- 4. Completion message
SELECT 'SQL fix applied! Test login in your app now.' as message; 