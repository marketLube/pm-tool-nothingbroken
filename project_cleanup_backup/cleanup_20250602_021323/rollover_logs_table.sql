-- Add rollover_logs table for monitoring scheduled rollover execution
CREATE TABLE IF NOT EXISTS rollover_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_date DATE NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rollover_logs_execution_date ON rollover_logs(execution_date);
CREATE INDEX IF NOT EXISTS idx_rollover_logs_executed_at ON rollover_logs(executed_at);

-- Enable RLS
ALTER TABLE rollover_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow read access to rollover logs" ON rollover_logs;
DROP POLICY IF EXISTS "Allow insert for rollover logging" ON rollover_logs;

-- Create RLS Policies (without IF NOT EXISTS)
CREATE POLICY "Allow read access to rollover logs" ON rollover_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for rollover logging" ON rollover_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Test the table
SELECT 'rollover_logs table created successfully' as status; 