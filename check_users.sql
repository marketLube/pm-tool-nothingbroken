-- Check all users in the database
SELECT 
    id,
    name,
    email,
    role,
    team,
    is_active,
    created_at
FROM users
ORDER BY role DESC, name;

-- Check if Althameem is Super Admin
SELECT 
    name,
    email,
    role,
    'Is Super Admin:' as status,
    CASE 
        WHEN role = 'super_admin' THEN '✅ YES' 
        ELSE '❌ NO' 
    END as super_admin_status
FROM users 
WHERE email = 'althameem@marketlube.in';

-- Count users by role
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM users
GROUP BY role
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        WHEN 'manager' THEN 3 
        WHEN 'employee' THEN 4 
        ELSE 5 
    END; 