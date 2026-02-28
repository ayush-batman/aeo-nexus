-- Add hackernews and stackoverflow to allowed forum platforms
ALTER TABLE public.forum_threads
DROP CONSTRAINT IF EXISTS forum_threads_platform_check;

ALTER TABLE public.forum_threads
ADD CONSTRAINT forum_threads_platform_check
CHECK (platform IN ('reddit', 'quora', 'teambhp', 'xbhp', 'youtube', 'hackernews', 'stackoverflow', 'web', 'other'));
