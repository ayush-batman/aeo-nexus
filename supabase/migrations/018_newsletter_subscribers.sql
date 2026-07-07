-- 018_newsletter_subscribers.sql
--
-- Blog newsletter subscribers. Kept intentionally small: email + created_at
-- + status + optional source. Confirm-and-unsubscribe flow lives in the app,
-- not the schema — tokens are UUIDs, not their own table.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email          text        NOT NULL UNIQUE,
    status         text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    source         text,       -- 'blog', 'india-index', 'contact-form', etc.
    unsubscribe_token uuid     NOT NULL DEFAULT gen_random_uuid(),
    subscribed_at  timestamptz NOT NULL DEFAULT now(),
    unsubscribed_at timestamptz
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx
  ON public.newsletter_subscribers (email);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
  ON public.newsletter_subscribers (status);

-- RLS: newsletter is admin-only for now (admin dashboard reads counts;
-- signup + unsubscribe go through the server routes with the service-role
-- client, bypassing RLS).
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- No policies added — RLS blocks all access until the admin surface
-- is built. Server routes using the service-role key are unaffected.

COMMENT ON TABLE public.newsletter_subscribers IS
    'Blog + product newsletter subscribers. Small on purpose. Sage rule: '
    'we don''t track opens, clicks, IPs, or referrers. Just email + status.';
