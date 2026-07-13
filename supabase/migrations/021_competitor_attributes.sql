-- Competitor Positioning Matrix
--
-- For every LLM scan, we do a second-pass extraction: what ATTRIBUTES
-- does the model associate with each competitor (and with your brand)?
-- e.g. Confluence → "enterprise", Obsidian → "local-first", Notion → "collaboration".
--
-- One row per (scan, brand-or-competitor, attribute) so we can count
-- frequency, track first_seen/last_seen, and compute deltas over time.
-- The /dashboard/positioning page pivots these into a matrix.

CREATE TABLE IF NOT EXISTS public.competitor_attributes (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    scan_id       uuid REFERENCES public.llm_scans(id) ON DELETE CASCADE,
    entity_name   text NOT NULL,        -- brand name or competitor name (as spelled by the LLM)
    entity_type   text NOT NULL,        -- 'brand' | 'competitor'
    attribute     text NOT NULL,        -- short lowercase noun phrase, e.g. "enterprise", "local-first"
    platform      text NOT NULL,
    confidence    numeric,              -- 0..1 from the extractor
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (entity_type IN ('brand', 'competitor'))
);

CREATE INDEX IF NOT EXISTS idx_comp_attrs_workspace
    ON public.competitor_attributes (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comp_attrs_entity
    ON public.competitor_attributes (workspace_id, entity_name, attribute);

CREATE INDEX IF NOT EXISTS idx_comp_attrs_scan
    ON public.competitor_attributes (scan_id);

ALTER TABLE public.competitor_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read competitor attributes"
    ON public.competitor_attributes
    FOR SELECT USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON u.org_id = w.org_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "service role writes competitor attributes"
    ON public.competitor_attributes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "service role deletes competitor attributes"
    ON public.competitor_attributes
    FOR DELETE USING (true);
