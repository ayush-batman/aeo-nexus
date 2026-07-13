-- Sentiment Drift Alerts
--
-- Weekly rollup of average sentiment per (workspace, prompt, platform).
-- The cron job at /api/cron/sentiment-drift computes this every Monday
-- from the prior 7 days of llm_scans rows and writes one snapshot per
-- distinct (workspace_id, prompt, platform) that had at least one scan.
--
-- Comparing week N vs week N-1 gives the drift magnitude. When
-- |delta| >= 0.3 we insert a row into the notifications table
-- (type = 'sentiment_drift') and send an email via Resend if the
-- workspace has opted in (alert_preferences.alert_type = 'sentiment_drift').

CREATE TABLE IF NOT EXISTS public.sentiment_drift_snapshots (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    prompt        text NOT NULL,
    platform      text NOT NULL,
    week_start    date NOT NULL,
    avg_sentiment numeric NOT NULL,
    sample_size   integer NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, prompt, platform, week_start)
);

CREATE INDEX IF NOT EXISTS idx_drift_workspace_week
    ON public.sentiment_drift_snapshots (workspace_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_drift_lookup
    ON public.sentiment_drift_snapshots (workspace_id, prompt, platform, week_start DESC);

ALTER TABLE public.sentiment_drift_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read drift snapshots"
    ON public.sentiment_drift_snapshots
    FOR SELECT USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON u.org_id = w.org_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "service role writes drift snapshots"
    ON public.sentiment_drift_snapshots
    FOR INSERT WITH CHECK (true);
