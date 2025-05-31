-- Add user rollover tracking table
-- This table keeps track of the last date processed for each user's task rollover
-- Ensures idempotent rollover operations - no matter how many times called, 
-- each day is only processed once per user

CREATE TABLE IF NOT EXISTS user_rollover (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_rollover_date DATE NOT NULL DEFAULT '1970-01-01',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for user_rollover table
ALTER TABLE user_rollover ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own rollover tracking
CREATE POLICY "Users can view own rollover tracking" ON user_rollover
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own rollover tracking" ON user_rollover
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own rollover tracking" ON user_rollover
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Admins can see all rollover tracking
CREATE POLICY "Admins can view all rollover tracking" ON user_rollover
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Admins can update any rollover tracking
CREATE POLICY "Admins can update any rollover tracking" ON user_rollover
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_rollover_user_id ON user_rollover(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rollover_last_date ON user_rollover(last_rollover_date);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_rollover_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_rollover_updated_at ON user_rollover;
CREATE TRIGGER trigger_update_user_rollover_updated_at
  BEFORE UPDATE ON user_rollover
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rollover_updated_at(); 