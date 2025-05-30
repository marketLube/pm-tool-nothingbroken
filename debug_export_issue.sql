-- Debug script for calendar export issue

-- 1. Check if the table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'calendar_exports'
) as table_exists;

-- 2. Check the current structure of calendar_exports
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calendar_exports' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'calendar_exports'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Check current user
SELECT auth.uid() as current_user_id;

-- 5. Check if current user exists in auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE id = auth.uid();

-- 6. Test if we can insert without created_by
-- This is just a test query - it won't actually insert
SELECT 
    'If you see this result, the table structure allows NULL created_by' as test_result
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_exports' 
    AND column_name = 'created_by'
    AND is_nullable = 'YES'
); 