import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '../../convex/_generated/api';
import { getToken } from '../auth-server';
import { resolveProvisionedWorkspace } from './workspace-resolution';
import type { WorkspaceBootstrapTimings } from '../observability/workspace-bootstrap';

export const getConvexWorkspaceContext = cache(async () => {
  const token = await getToken();
  if (!token) return null;
  const activeWorkspacePublicId = (await cookies()).get('active-workspace-id')?.value ?? null;
  // Reuse this request's verified token rather than fetching it again per call.
  // Convex still validates the session and tenant inside every function.
  const options = { token, url: process.env.NEXT_PUBLIC_CONVEX_URL };
  return resolveProvisionedWorkspace(
    () => fetchQuery(api.users.workspaceContext, { activeWorkspacePublicId }, options),
    () => fetchMutation(api.users.provisionCurrentUser, {}, options),
  );
});

export const getConvexDashboardBootstrap = cache(async (timings?: WorkspaceBootstrapTimings) => {
  const tokenStarted = performance.now();
  let token: string | undefined;
  try {
    token = await getToken();
  } finally {
    if (timings) timings.tokenMs = performance.now() - tokenStarted;
  }
  if (!token) return null;
  const activeWorkspacePublicId = (await cookies()).get('active-workspace-id')?.value ?? null;
  const options = { token, url: process.env.NEXT_PUBLIC_CONVEX_URL };
  const backendStarted = performance.now();
  try {
    return await resolveProvisionedWorkspace(
      () => fetchQuery(api.dashboard.bootstrap, { activeWorkspacePublicId }, options),
      () => {
        if (timings) timings.provisioned = true;
        return fetchMutation(api.users.provisionCurrentUser, {}, options);
      },
    );
  } finally {
    if (timings) timings.backendMs = performance.now() - backendStarted;
  }
});
