-- Interventions: the PROOF layer
-- Every action a user takes to improve AI visibility is logged here with a
-- baseline snapshot at action time and (later) a followup snapshot showing
-- the delta. This is what makes Aelo class-apart: not just "what does the AI
-- say", but "what did I do about it, and did it work — with the receipt".

CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- What was done
    action_type TEXT NOT NULL CHECK (action_type IN (
        'forum_reply',       -- posted a Reddit / forum reply
        'content_publish',   -- shipped a new page/article
        'content_update',    -- edited an existing page for AEO
        'schema_add',        -- added structured data / schema.org markup
        'backlink_earned',   -- new backlink from an AI-indexed source
        'llms_txt_update',   -- updated llms.txt
        'other'
    )),

    -- One-line title + optional details
    title TEXT NOT NULL,
    description TEXT,
    -- Where the action landed (URL, forum post link, page URL, etc.)
    action_url TEXT,

    -- Optional linkages to the source that triggered the action
    forum_thread_id UUID REFERENCES forum_threads(id) ON DELETE SET NULL,

    -- Which prompts we expect this action to move the needle on
    -- Any llm_scans in this workspace matching these prompts are eligible
    -- for baseline/followup comparison.
    target_prompts TEXT[] DEFAULT '{}',

    -- Lifecycle
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
        'planned',      -- decided to do it, not yet done
        'in_progress',
        'completed',    -- action shipped, waiting for AI indexing
        'measured'      -- followup scan done, delta computed
    )),

    -- The moment we consider the "before"
    action_taken_at TIMESTAMPTZ,

    -- Denormalized snapshots so the "before" number is stable even if scans
    -- get pruned later. Format:
    --   { "<prompt>": { "<platform>": { "mentioned": bool, "position": int|null,
    --                                    "visibility": int, "sentiment": text }}}
    baseline_snapshot JSONB DEFAULT '{}',
    impact_snapshot   JSONB DEFAULT '{}',

    -- Rolled-up delta for quick UI display
    -- Format: { "visibility_change": +18, "position_change": -2,
    --           "measured_at": "...", "verdict": "improved|no_change|regressed" }
    impact_summary JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interventions_workspace       ON interventions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status          ON interventions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_interventions_action_taken_at ON interventions(workspace_id, action_taken_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_interventions_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_interventions_updated_at ON interventions;
CREATE TRIGGER trg_interventions_updated_at
    BEFORE UPDATE ON interventions
    FOR EACH ROW EXECUTE FUNCTION set_interventions_updated_at();

-- RLS: workspace scoped by org, same pattern as other tables
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interventions_workspace_scoped" ON interventions;
CREATE POLICY "interventions_workspace_scoped"
    ON interventions
    FOR ALL
    USING (
        workspace_id IN (
            SELECT w.id
            FROM workspaces w
            WHERE w.org_id IN (
                SELECT u.org_id FROM users u WHERE u.id = auth.uid()
            )
        )
    );
