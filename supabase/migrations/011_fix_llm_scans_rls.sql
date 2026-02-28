-- Fix RLS for llm_scans table
ALTER TABLE llm_scans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view scans in their workspace" ON llm_scans;
DROP POLICY IF EXISTS "Users can create scans in their workspace" ON llm_scans;

-- Create comprehensive policies
CREATE POLICY "Users can view scans in their workspace"
ON llm_scans FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM workspaces
    WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create scans in their workspace"
ON llm_scans FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces
    WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Ensure forum_threads also has correct policies
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view threads in their workspace" ON forum_threads;
DROP POLICY IF EXISTS "Users can create threads in their workspace" ON forum_threads;
DROP POLICY IF EXISTS "Users can update threads in their workspace" ON forum_threads;

CREATE POLICY "Users can view threads in their workspace"
ON forum_threads FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM workspaces
    WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create threads in their workspace"
ON forum_threads FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces
    WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update threads in their workspace"
ON forum_threads FOR UPDATE
USING (
  workspace_id IN (
    SELECT id FROM workspaces
    WHERE org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  )
);
