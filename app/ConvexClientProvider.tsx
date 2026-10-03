'use client';

import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

import { authClient } from '@/lib/auth-client';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
// @convex-dev/better-auth#420: its provider type rejects the matching
// better-auth 1.6.22+ client even though this is the documented runtime pair.
// Keep the security-patched Better Auth version and narrow only at this seam.
const providerAuthClient = authClient as unknown as AuthClient;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return children;

  return (
    <ConvexBetterAuthProvider client={convex} authClient={providerAuthClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
