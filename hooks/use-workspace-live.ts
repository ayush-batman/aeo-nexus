'use client';
import { useEffect, useRef, useState } from 'react';
import { useConvexAuth, useConvexConnectionState, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useWorkspaceLive(onChange: () => void) {
  const { isAuthenticated } = useConvexAuth();
  const connection = useConvexConnectionState();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    void fetch('/api/onboarding/context', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (response.ok) setWorkspaceId((await response.json()).workspaceId); })
      .catch(() => { /* The page's normal load/retry state remains authoritative. */ });
    return () => controller.abort();
  }, [isAuthenticated]);
  const head = useQuery(api.live.head, isAuthenticated && workspaceId ? { workspaceId } : 'skip');
  const prior = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (head !== undefined && head !== prior.current) {
      if (prior.current !== undefined) callback.current();
      prior.current = head;
    }
  }, [head]);
  return head !== undefined && isAuthenticated && connection.isWebSocketConnected;
}
