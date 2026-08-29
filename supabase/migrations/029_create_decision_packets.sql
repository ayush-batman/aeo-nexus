-- 029: Persist the versioned activation decision packet.
-- Existing scans remain the evidence source; this row freezes the user-facing
-- packet so a refresh or return visit shows the same result and next action.

CREATE TABLE IF NOT EXISTS public.decision_packets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contract_version text NOT NULL DEFAULT 'decision-packet.v1',
    status text NOT NULL CHECK (status IN ('complete', 'partial', 'all_failed', 'untracked')),
    prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
    packet jsonb NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decision_packets_workspace_created_idx
    ON public.decision_packets (workspace_id, created_at DESC);

ALTER TABLE public.decision_packets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read decision packets" ON public.decision_packets;
CREATE POLICY "org members read decision packets"
    ON public.decision_packets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.workspaces w
            JOIN public.users u ON u.org_id = w.org_id
            WHERE w.id = decision_packets.workspace_id
              AND u.id = auth.uid()
        )
    );

-- Writes use the server service role after cookie auth, role checks, quota,
-- and workspace binding. With RLS enabled and no authenticated write policy,
-- browser clients cannot fabricate or replace packets.

COMMENT ON TABLE public.decision_packets IS
    'Versioned, immutable activation receipts built from stored measurement samples.';
