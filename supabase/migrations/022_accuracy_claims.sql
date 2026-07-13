-- Accuracy Verdict
--
-- For every scan, we extract the factual claims the LLM made about the
-- tracked brand, then verify each against the brand's own site (and,
-- fallback, general web reasoning). One row per (scan, claim).
--
-- The verdict is the differentiator: competitors measure mention.
-- Only Aelo tells you whether what the AI is saying is TRUE.

CREATE TABLE IF NOT EXISTS public.accuracy_claims (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    scan_id       uuid NOT NULL REFERENCES public.llm_scans(id) ON DELETE CASCADE,
    claim_text    text NOT NULL,
    verdict       text NOT NULL,   -- 'true' | 'false' | 'outdated' | 'unverified'
    confidence    numeric,         -- 0..1 from the verifier
    evidence_url  text,            -- URL of the source the verifier consulted (nullable)
    evidence_snippet text,         -- ≤400 chars of the source that grounded the verdict
    reasoning     text,            -- one-sentence explanation the UI shows
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (verdict IN ('true', 'false', 'outdated', 'unverified'))
);

CREATE INDEX IF NOT EXISTS idx_accuracy_workspace
    ON public.accuracy_claims (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_accuracy_scan
    ON public.accuracy_claims (scan_id);

CREATE INDEX IF NOT EXISTS idx_accuracy_verdict
    ON public.accuracy_claims (workspace_id, verdict);

ALTER TABLE public.accuracy_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read accuracy claims"
    ON public.accuracy_claims
    FOR SELECT USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON u.org_id = w.org_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "service role writes accuracy claims"
    ON public.accuracy_claims
    FOR INSERT WITH CHECK (true);

CREATE POLICY "service role deletes accuracy claims"
    ON public.accuracy_claims
    FOR DELETE USING (true);
