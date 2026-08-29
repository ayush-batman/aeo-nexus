-- Additive receipt metadata used to decide whether two scan cohorts are comparable.
ALTER TABLE public.llm_scans
  ADD COLUMN IF NOT EXISTS measurement_run_id uuid,
  ADD COLUMN IF NOT EXISTS measurement_contract_version text,
  ADD COLUMN IF NOT EXISTS sample_number integer,
  ADD COLUMN IF NOT EXISTS provider_model text,
  ADD COLUMN IF NOT EXISTS measurement_region text,
  ADD COLUMN IF NOT EXISTS measurement_mode text,
  ADD COLUMN IF NOT EXISTS scorer_version text;

ALTER TABLE public.llm_scans
  DROP CONSTRAINT IF EXISTS llm_scans_sample_number_check,
  ADD CONSTRAINT llm_scans_sample_number_check
    CHECK (sample_number IS NULL OR sample_number BETWEEN 1 AND 8),
  DROP CONSTRAINT IF EXISTS llm_scans_measurement_mode_check,
  ADD CONSTRAINT llm_scans_measurement_mode_check
    CHECK (measurement_mode IS NULL OR measurement_mode IN ('standard', 'battle'));

CREATE INDEX IF NOT EXISTS idx_llm_scans_measurement_run
  ON public.llm_scans (workspace_id, measurement_run_id)
  WHERE measurement_run_id IS NOT NULL;

COMMENT ON COLUMN public.llm_scans.provider_model IS
  'Exact provider model/deployment label reported by the scan adapter.';
COMMENT ON COLUMN public.llm_scans.measurement_region IS
  'Configured measurement region; global-unspecified is explicit, not inferred.';
COMMENT ON COLUMN public.llm_scans.scorer_version IS
  'Aelo scorer policy used to classify the stored answer.';
