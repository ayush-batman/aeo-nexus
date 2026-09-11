import { ConvexError } from 'convex/values';

// No cross-request cache: membership and workspace authorization remain live.
export async function resolveProvisionedWorkspace<T>(read: () => Promise<T>, provision: () => Promise<unknown>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    // Only the server's explicit missing-profile state permits account creation.
    // Outages, revoked membership and unverified email must not trigger writes.
    if (!(error instanceof ConvexError) || error.data !== 'profile_not_provisioned') throw error;
    await provision();
    return read();
  }
}
