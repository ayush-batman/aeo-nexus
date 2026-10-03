-- Weekly sentiment comparisons must use the same evidence compatibility key
-- as visibility comparisons. Legacy snapshots remain readable but are never
-- compared with versioned snapshots because these fields are null.

ALTER TABLE public.sentiment_drift_snapshots
  ADD COLUMN IF NOT EXISTS provider_model text,
  ADD COLUMN IF NOT EXISTS measurement_region text,
  ADD COLUMN IF NOT EXISTS measurement_mode text,
  ADD COLUMN IF NOT EXISTS scorer_version text,
  ADD COLUMN IF NOT EXISTS measurement_contract_version text;

ALTER TABLE public.sentiment_drift_snapshots
  DROP CONSTRAINT IF EXISTS sentiment_drift_snapshots_workspace_id_prompt_platform_week_start_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_drift_compatible_week
  ON public.sentiment_drift_snapshots (
    workspace_id,
    prompt,
    platform,
    provider_model,
    measurement_region,
    measurement_mode,
    scorer_version,
    measurement_contract_version,
    week_start
  );

DROP POLICY IF EXISTS "service role writes drift snapshots" ON public.sentiment_drift_snapshots;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.sentiment_drift_snapshots FROM anon, authenticated;
GRANT SELECT ON TABLE public.sentiment_drift_snapshots TO authenticated;
