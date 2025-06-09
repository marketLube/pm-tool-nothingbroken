-- Setup Script for Super Admin System
-- Run this after executing super_admin_migration.sql

-- Step 1: First, run the super admin migration (if not already done)
-- Make sure to execute super_admin_migration.sql first

-- Step 2: Promote Althameem to Super Admin
-- Replace with the actual user ID if different
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'althameem@marketlube.in' AND is_active = true;

-- Step 3: Verify the promotion
SELECT 
    id, 
    name, 
    email, 
    role, 
    team, 
    is_active,
    created_at
FROM users 
WHERE email = 'althameem@marketlube.in';

-- Step 4: Verify Super Admin functions work
SELECT is_super_admin(id) as is_super_admin_check
FROM users 
WHERE email = 'althameem@marketlube.in';

-- Step 5: Check available modules
SELECT 
    name,
    display_name,
    description,
    icon,
    is_active
FROM modules 
ORDER BY display_name;

-- Step 6: Test module permission functions (replace with actual user IDs)
-- This will test granting a permission to an admin user
-- Make sure to replace the UUIDs with actual values from your database

-- First, let's see what admin users exist:
SELECT 
    id,
    name,
    email,
    role,
    team
FROM users 
WHERE role = 'admin' AND is_active = true
ORDER BY name;

-- Example of granting insights module to an admin (replace UUIDs with actual values):
-- SELECT grant_module_permission(
--     'admin-user-uuid-here'::UUID,
--     'insights',
--     (SELECT id FROM users WHERE email = 'althameem@marketlube.in')::UUID
-- );

-- Step 7: Verify the module permission view works
SELECT * FROM user_module_permissions 
ORDER BY user_name, module_display_name;

-- Step 8: Log the Super Admin setup
INSERT INTO user_audit_log (
    user_id,
    action,
    old_values,
    new_values,
    performed_by,
    timestamp,
    metadata
) 
SELECT 
    id::TEXT,
    'USER_UPDATED',
    jsonb_build_object('role', 'admin'),
    jsonb_build_object('role', 'super_admin'),
    id::TEXT,
    NOW(),
    jsonb_build_object(
        'action_type', 'initial_super_admin_setup',
        'setup_date', NOW(),
        'system_version', '1.0.0'
    )
FROM users 
WHERE email = 'althameem@marketlube.in' AND role = 'super_admin';

-- Success message
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM users WHERE email = 'althameem@marketlube.in' AND role = 'super_admin') THEN
        RAISE NOTICE '✅ SUCCESS: Althameem has been promoted to Super Admin!';
        RAISE NOTICE '🔧 Next steps:';
        RAISE NOTICE '   1. Log in as Althameem';
        RAISE NOTICE '   2. Navigate to Super Admin > Modules';
        RAISE NOTICE '   3. Assign module permissions to Admin users';
        RAISE NOTICE '   4. Test role promotion features';
    ELSE
        RAISE NOTICE '❌ ERROR: Failed to promote Althameem to Super Admin';
        RAISE NOTICE '🔍 Check if the user exists and is active';
    END IF;
END $$; 