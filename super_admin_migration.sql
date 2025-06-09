-- Super Admin System Migration
-- Execute these statements in your Supabase SQL editor
-- This creates the module-based permission system for Super Admin

-- 1. Add super_admin role to users table (extend existing role enum)
-- First, let's see if we need to modify the role field
-- For now, we'll handle super_admin as a regular string in the role field

-- 2. Create modules table for available system modules
CREATE TABLE IF NOT EXISTS modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Settings',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create module_permissions table for Admin module assignments
CREATE TABLE IF NOT EXISTS module_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    module_id UUID NOT NULL,
    granted_by UUID NOT NULL, -- Super Admin who granted the permission
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, module_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- 4. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_module_permissions_user_id ON module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_module_id ON module_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_active ON module_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_modules_active ON modules(is_active);

-- 5. Insert default system modules
INSERT INTO modules (name, display_name, description, icon) VALUES
    ('insights', 'Insights', 'Access to dashboards, analytics, and reports', 'BarChart3'),
    ('accounts', 'Accounts', 'Financial settings, billing, and invoicing', 'CreditCard'),
    ('notifications', 'Notifications', 'Notification management and settings', 'Bell'),
    ('integrations', 'Integrations', 'Third-party integrations and API access', 'Plug'),
    ('audit_logs', 'Audit Logs', 'System audit logs and security monitoring', 'Shield'),
    ('api_access', 'API Access', 'API keys and programmatic access', 'Code'),
    ('system_settings', 'System Settings', 'Advanced system configuration', 'Settings'),
    ('backup_restore', 'Backup & Restore', 'Database backup and restore operations', 'Database')
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- 6. Create function to check if user is Super Admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role = 'super_admin' 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check module permissions
CREATE OR REPLACE FUNCTION has_module_permission(
    user_id UUID,
    module_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super Admin has access to all modules
    IF is_super_admin(user_id) THEN
        RETURN true;
    END IF;
    
    -- Check if user has specific module permission
    RETURN EXISTS (
        SELECT 1 
        FROM module_permissions mp
        JOIN modules m ON mp.module_id = m.id
        WHERE mp.user_id = user_id
        AND m.name = module_name
        AND mp.is_active = true
        AND m.is_active = true
        AND mp.revoked_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to grant module permission (Super Admin only)
CREATE OR REPLACE FUNCTION grant_module_permission(
    target_user_id UUID,
    module_name TEXT,
    granted_by_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    module_uuid UUID;
    permission_id UUID;
BEGIN
    -- Check if granter is Super Admin
    IF NOT is_super_admin(granted_by_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only Super Admin can grant module permissions'
        );
    END IF;
    
    -- Check if target user exists and is Admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = target_user_id 
        AND role = 'admin' 
        AND "isActive" = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Target user must be an active Admin'
        );
    END IF;
    
    -- Get module ID
    SELECT id INTO module_uuid FROM modules WHERE name = module_name AND is_active = true;
    
    IF module_uuid IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Module not found or inactive'
        );
    END IF;
    
    -- Insert or update permission
    INSERT INTO module_permissions (user_id, module_id, granted_by, is_active)
    VALUES (target_user_id, module_uuid, granted_by_user_id, true)
    ON CONFLICT (user_id, module_id) 
    DO UPDATE SET 
        granted_by = EXCLUDED.granted_by,
        granted_at = NOW(),
        revoked_at = NULL,
        is_active = true
    RETURNING id INTO permission_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'permission_id', permission_id,
        'message', 'Module permission granted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to revoke module permission (Super Admin only)
CREATE OR REPLACE FUNCTION revoke_module_permission(
    target_user_id UUID,
    module_name TEXT,
    revoked_by_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    module_uuid UUID;
BEGIN
    -- Check if revoker is Super Admin
    IF NOT is_super_admin(revoked_by_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only Super Admin can revoke module permissions'
        );
    END IF;
    
    -- Get module ID
    SELECT id INTO module_uuid FROM modules WHERE name = module_name AND is_active = true;
    
    IF module_uuid IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Module not found'
        );
    END IF;
    
    -- Revoke permission
    UPDATE module_permissions 
    SET 
        is_active = false,
        revoked_at = NOW()
    WHERE user_id = target_user_id 
    AND module_id = module_uuid 
    AND is_active = true;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Module permission revoked successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to promote user to Super Admin
CREATE OR REPLACE FUNCTION promote_to_super_admin(
    target_user_id UUID,
    promoted_by_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    -- Check if promoter is Super Admin
    IF NOT is_super_admin(promoted_by_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only Super Admin can promote users to Super Admin'
        );
    END IF;
    
    -- Check if target user exists and is Admin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = target_user_id 
        AND role = 'admin' 
        AND "isActive" = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Target user must be an active Admin'
        );
    END IF;
    
    -- Promote to Super Admin
    UPDATE users 
    SET 
        role = 'super_admin',
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the promotion in audit log
    INSERT INTO user_audit_log (
        user_id,
        action,
        old_values,
        new_values,
        performed_by,
        timestamp,
        metadata
    ) VALUES (
        target_user_id::TEXT,
        'USER_UPDATED',
        jsonb_build_object('role', 'admin'),
        jsonb_build_object('role', 'super_admin'),
        promoted_by_user_id::TEXT,
        NOW(),
        jsonb_build_object('action_type', 'promotion_to_super_admin')
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User promoted to Super Admin successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create view for easy module permission queries
CREATE OR REPLACE VIEW user_module_permissions AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    m.id as module_id,
    m.name as module_name,
    m.display_name as module_display_name,
    m.description as module_description,
    m.icon as module_icon,
    mp.is_active as has_permission,
    mp.granted_at,
    mp.revoked_at,
    grantor.name as granted_by_name
FROM users u
CROSS JOIN modules m
LEFT JOIN module_permissions mp ON u.id = mp.user_id AND m.id = mp.module_id AND mp.is_active = true
LEFT JOIN users grantor ON mp.granted_by = grantor.id
WHERE u.role IN ('admin', 'super_admin') 
AND u."isActive" = true 
AND m.is_active = true
ORDER BY u.name, m.display_name;

-- 12. Enable RLS on new tables
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for modules table
CREATE POLICY "Anyone can read active modules" ON modules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only Super Admin can manage modules" ON modules
    FOR ALL USING (
        is_super_admin(auth.uid())
    );

-- 14. Create RLS policies for module_permissions table
CREATE POLICY "Users can read own module permissions" ON module_permissions
    FOR SELECT USING (
        user_id = auth.uid() OR 
        is_super_admin(auth.uid())
    );

CREATE POLICY "Only Super Admin can manage module permissions" ON module_permissions
    FOR ALL USING (
        is_super_admin(auth.uid())
    );

-- 15. Initial Super Admin setup (replace with actual user ID)
-- Note: This should be run manually with the actual user ID for Althameem
-- UPDATE users SET role = 'super_admin' WHERE email = 'althameem@marketlube.in';

COMMENT ON TABLE modules IS 'Available system modules that can be assigned to Admin users';
COMMENT ON TABLE module_permissions IS 'Tracks which modules each Admin user has access to';
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Checks if a user has Super Admin role';
COMMENT ON FUNCTION has_module_permission(UUID, TEXT) IS 'Checks if user has permission for specific module';
COMMENT ON VIEW user_module_permissions IS 'Convenient view for querying user module permissions'; 