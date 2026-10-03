import { withKey } from '@/lib/api-v1';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';

export async function GET(request: Request) {
  return withKey(request, 'read', async (context) => callInternal('action', internal.crawlerActions.forKey,
    { workspaceId: context.workspaceId, keyId: context.keyId }));
}
