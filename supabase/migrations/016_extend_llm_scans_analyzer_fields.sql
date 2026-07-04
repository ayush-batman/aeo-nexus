-- Extend llm_scans with the rich fields the analyzer already produces.
-- Before this migration the scanner emitted brand_variants / sentiment_score /
-- sentiment_reason / list_items / confidence but the writer had to drop them
-- because the columns didn't exist — silently losing signal that the DIAGNOSE
-- and PRESCRIBE layers want. Also broadens the platform CHECK to include
-- google_ai_overview (already produced by the scanner).

ALTER TABLE public.llm_scans
    ADD COLUMN IF NOT EXISTS brand_variants   text[]  DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS sentiment_score  numeric,
    ADD COLUMN IF NOT EXISTS sentiment_reason text,
    ADD COLUMN IF NOT EXISTS list_items       text[]  DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS confidence       numeric;

-- Broaden platform values: google_ai_overview is a real scanner output
-- (Gemini simulating Google's AI Overview). 'mock' stays banned per the
-- honest-data policy (a mock row must never persist as real).
ALTER TABLE public.llm_scans
    DROP CONSTRAINT IF EXISTS llm_scans_platform_check;

ALTER TABLE public.llm_scans
    ADD CONSTRAINT llm_scans_platform_check
    CHECK (platform IN (
        'chatgpt', 'perplexity', 'claude', 'gemini',
        'google_ai', 'google_ai_overview', 'bing_copilot'
    ));
