-- =====================================================
-- CREATE STATUSES TABLE AND POPULATE WITH DEFAULT DATA
-- =====================================================
-- Run this in Supabase SQL Editor to create the statuses table

-- 1. Create the statuses table
CREATE TABLE IF NOT EXISTS statuses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('creative', 'web')),
  color TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_statuses_team ON statuses(team);
CREATE INDEX IF NOT EXISTS idx_statuses_order ON statuses("order");
CREATE INDEX IF NOT EXISTS idx_statuses_team_order ON statuses(team, "order");

-- 3. Enable Row Level Security
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Allow all authenticated users to read statuses
CREATE POLICY "Anyone can view statuses" ON statuses
  FOR SELECT USING (true);

-- Only admins can insert, update, or delete statuses
CREATE POLICY "Only admins can insert statuses" ON statuses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update statuses" ON statuses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete statuses" ON statuses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- 5. Insert default statuses for creative team
INSERT INTO statuses (id, name, team, color, "order") VALUES
  ('creative_not_started', 'Not Started', 'creative', '#94a3b8', 0),
  ('creative_scripting', 'Scripting', 'creative', '#a78bfa', 1),
  ('creative_script_confirmed', 'Script Confirmed', 'creative', '#8b5cf6', 2),
  ('creative_shoot_pending', 'Shoot Pending', 'creative', '#f97316', 3),
  ('creative_shoot_finished', 'Shoot Finished', 'creative', '#fb923c', 4),
  ('creative_edit_pending', 'Edit Pending', 'creative', '#3b82f6', 5),
  ('creative_client_approval', 'Client Approval', 'creative', '#ec4899', 6),
  ('creative_approved', 'Approved', 'creative', '#22c55e', 7)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert default statuses for web team
INSERT INTO statuses (id, name, team, color, "order") VALUES
  ('web_proposal_awaiting', 'Proposal Awaiting', 'web', '#94a3b8', 0),
  ('web_not_started', 'Not Started', 'web', '#6b7280', 1),
  ('web_ui_started', 'UI Started', 'web', '#a78bfa', 2),
  ('web_ui_finished', 'UI Finished', 'web', '#8b5cf6', 3),
  ('web_development_started', 'Development Started', 'web', '#3b82f6', 4),
  ('web_development_finished', 'Development Finished', 'web', '#2563eb', 5),
  ('web_testing', 'Testing', 'web', '#f97316', 6),
  ('web_handed_over', 'Handed Over', 'web', '#fb923c', 7),
  ('web_client_reviewing', 'Client Reviewing', 'web', '#ec4899', 8),
  ('web_completed', 'Completed', 'web', '#22c55e', 9)
ON CONFLICT (id) DO NOTHING;

-- 7. Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create trigger to automatically update updated_at
CREATE TRIGGER update_statuses_updated_at 
  BEFORE UPDATE ON statuses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Verify the data was inserted
SELECT 
  team,
  COUNT(*) as status_count,
  STRING_AGG(name, ', ' ORDER BY "order") as statuses
FROM statuses 
GROUP BY team 
ORDER BY team; 