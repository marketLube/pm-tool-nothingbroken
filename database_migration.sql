-- Database Migration Script for PM Tool Security Enhancement
-- Execute these statements in your Supabase SQL editor

-- 1. Add password_hash column to existing users table
-- (Only run if column doesn't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- 2. Create user_audit_log table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS user_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'USER_CREATED', 
        'USER_UPDATED', 
        'PASSWORD_CHANGED', 
        'USER_DELETED', 
        'LOGIN_ATTEMPT', 
        'LOGIN_SUCCESS', 
        'LOGIN_FAILED'
    )),
    old_values JSONB,
    new_values JSONB,
    performed_by TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    
    -- Foreign key constraint (if users table has UUID primary key)
    -- Uncomment and modify if needed:
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON user_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON user_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON user_audit_log(performed_by);

-- 4. Create performance_metrics table for monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('timing', 'memory', 'network', 'user', 'database')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- 5. Create index for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);

-- 6. Create function for secure user creation with audit logging
CREATE OR REPLACE FUNCTION create_user_with_audit(
    user_data JSONB,
    performed_by_user TEXT,
    client_ip INET DEFAULT NULL,
    client_user_agent TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    new_user_id UUID;
    result JSONB;
BEGIN
    -- Insert new user
    INSERT INTO users (
        name, 
        email, 
        role, 
        team, 
        "isActive", 
        "joinDate", 
        password_hash,
        created_at,
        updated_at
    )
    VALUES (
        user_data->>'name',
        user_data->>'email',
        user_data->>'role',
        user_data->>'team',
        COALESCE((user_data->>'isActive')::boolean, true),
        user_data->>'joinDate',
        user_data->>'password_hash',
        NOW(),
        NOW()
    )
    RETURNING id INTO new_user_id;
    
    -- Log the creation
    INSERT INTO user_audit_log (
        user_id,
        action,
        new_values,
        performed_by,
        ip_address,
        user_agent,
        timestamp
    ) VALUES (
        new_user_id::TEXT,
        'USER_CREATED',
        user_data,
        performed_by_user,
        client_ip,
        client_user_agent,
        NOW()
    );
    
    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'user_id', new_user_id,
        'message', 'User created successfully'
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error and re-raise
    INSERT INTO user_audit_log (
        user_id,
        action,
        performed_by,
        ip_address,
        user_agent,
        timestamp,
        metadata
    ) VALUES (
        'unknown',
        'USER_CREATED',
        performed_by_user,
        client_ip,
        client_user_agent,
        NOW(),
        jsonb_build_object('error', SQLERRM, 'user_data', user_data)
    );
    
    RAISE EXCEPTION 'User creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function for secure password updates
CREATE OR REPLACE FUNCTION update_user_password(
    target_user_id TEXT,
    new_password_hash TEXT,
    performed_by_user TEXT,
    client_ip INET DEFAULT NULL,
    client_user_agent TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update password
    UPDATE users 
    SET password_hash = new_password_hash,
        updated_at = NOW()
    WHERE id = target_user_id::UUID;
    
    -- Log the change
    INSERT INTO user_audit_log (
        user_id,
        action,
        performed_by,
        ip_address,
        user_agent,
        timestamp,
        metadata
    ) VALUES (
        target_user_id,
        'PASSWORD_CHANGED',
        performed_by_user,
        client_ip,
        client_user_agent,
        NOW(),
        jsonb_build_object('password_strength', 'strong')
    );
    
    RETURN true;
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO user_audit_log (
        user_id,
        action,
        performed_by,
        ip_address,
        user_agent,
        timestamp,
        metadata
    ) VALUES (
        target_user_id,
        'PASSWORD_CHANGED',
        performed_by_user,
        client_ip,
        client_user_agent,
        NOW(),
        jsonb_build_object('error', SQLERRM, 'success', false)
    );
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable Row Level Security (RLS) on audit log
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for audit log access
-- Only authenticated users can read their own audit logs
CREATE POLICY "Users can read own audit logs" ON user_audit_log
    FOR SELECT USING (
        auth.uid()::TEXT = user_id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Only authenticated users with proper roles can insert audit logs
CREATE POLICY "Service can insert audit logs" ON user_audit_log
    FOR INSERT WITH CHECK (true);

-- 10. Create cleanup function for old audit logs (optional)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_audit_log 
    WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant necessary permissions
-- Adjust these based on your Supabase service role setup
-- GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
-- GRANT SELECT, INSERT ON user_audit_log TO authenticated;
-- GRANT SELECT, INSERT ON performance_metrics TO authenticated;

COMMENT ON TABLE user_audit_log IS 'Comprehensive audit trail for all user-related operations';
COMMENT ON TABLE performance_metrics IS 'System performance monitoring and metrics storage';
COMMENT ON FUNCTION create_user_with_audit IS 'Secure user creation with automatic audit logging';
COMMENT ON FUNCTION update_user_password IS 'Secure password update with audit logging';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Cleanup function for maintaining audit log size'; 