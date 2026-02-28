-- Allow YouTube as a forum platform
ALTER TABLE public.forum_threads
DROP CONSTRAINT IF EXISTS forum_threads_platform_check;

ALTER TABLE public.forum_threads
ADD CONSTRAINT forum_threads_platform_check
CHECK (platform in ('reddit', 'quora', 'teambhp', 'xbhp', 'youtube', 'other'));
