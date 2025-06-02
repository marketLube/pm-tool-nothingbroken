-- PM Tool Security Migration - Simple Step-by-Step Version
-- Run each section separately if you encounter issues

-- STEP 1: Add password_hash column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- STEP 2: Create basic audit log table
CREATE TABLE IF NOT EXISTS user_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- STEP 3: Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- STEP 4: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON user_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- STEP 5: Enable Row Level Security
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- STEP 6: Test the tables
SELECT 'Tables created successfully!' as result;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_audit_log', 'performance_metrics'); 