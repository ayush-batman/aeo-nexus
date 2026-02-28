-- Create analytics_events table for tracking AI traffic
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'pageview', 'conversion'
    referrer TEXT,
    ai_source TEXT, -- 'chatgpt', 'gemini', 'perplexity', 'claude', 'bing', 'other'
    path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast querying by workspace and time
CREATE INDEX IF NOT EXISTS idx_analytics_workspace_time ON public.analytics_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_ai_source ON public.analytics_events(ai_source);

-- RLS Policies
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their workspace
CREATE POLICY "Users can view own workspace analytics"
    ON public.analytics_events FOR SELECT
    USING (workspace_id IN (
        SELECT id FROM public.workspaces WHERE org_id IN (
            SELECT org_id FROM public.users WHERE id = auth.uid()
        )
    ));

-- Ingestion Policy: Allow insertion if workspace_id matches (we might need a more open policy for the pixel if using public API keys, but for now assuming auth or signed requests)
-- FOR NOW: We will use a server-side API route that has Service Role access to insert, so RLS for insert isn't strictly needed for the API.
-- BUT if we want to allow insertion via RLS, we need a way to authenticate the "Pixel".
-- Strategy: The Pixel sends a request to Next.js API. Next.js API verifies the "App ID" (Workspace ID) and inserts row using Service Role. 
-- So RLS for SELECT is key.

-- Allow service role full access (implicit)
