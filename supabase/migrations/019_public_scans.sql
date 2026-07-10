-- 019_public_scans.sql
--
-- Free-tier public scans. Unauthenticated visitors get 3 scans per week per
-- (ip_hash) so the landing page can offer a live demo without a signup gate.
--
-- Public scans are stored separately from llm_scans (not tied to a workspace)
-- so:
--   1. Rate limiting is trivially isolated
--   2. Real customer data never mixes with visitor demo data
--   3. Cleanup is straightforward (TTL-delete after 30 days)
--
-- Each public scan gets a shareable URL: /scan/{id}. That's the viral loop.

CREATE TABLE IF NOT EXISTS public.public_scans (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash         text        NOT NULL,   -- sha256(ip + user-agent salt)
    brand_name      text        NOT NULL,
    prompt          text        NOT NULL,
    platform        text        NOT NULL DEFAULT 'gemini',
    response        text,                   -- full LLM response, verbatim
    brand_mentioned boolean,
    mention_position integer,
    sentiment       text        CHECK (sentiment IN ('positive', 'neutral', 'negative') OR sentiment IS NULL),
    competitors_mentioned text[],
    citations       jsonb,                  -- [{url, title, isOwnDomain}]
    error_message   text,                   -- populated if the scan itself failed
    email           text,                   -- optional: captured post-scan for follow-up
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_scans_ip_hash_idx   ON public.public_scans (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS public_scans_created_at_idx ON public.public_scans (created_at DESC);

-- RLS: public scan view is anonymous by design (share links must work
-- without auth), but write access is server-only.
ALTER TABLE public.public_scans ENABLE ROW LEVEL SECURITY;

-- Anyone can read a public scan by ID (the whole point of a share link).
CREATE POLICY "public_scans_select_by_id"
    ON public.public_scans
    FOR SELECT
    USING (true);

-- Nobody can write via RLS — inserts go through the server route with the
-- service-role key so rate limits are enforced.

COMMENT ON TABLE public.public_scans IS
    'Free-tier scans from unauthenticated visitors. Rate-limited by ip_hash. '
    'Each scan produces a shareable receipt at /scan/{id}. Auto-purged after 30 days.';
