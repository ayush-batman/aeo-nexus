import { withKey } from '@/lib/api-v1';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { apiReceipt } from '@/lib/convex/measurement-receipt';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withKey(request, 'measure', async (context) => {
    const { id } = await params;
    const measurement = await apiReceipt(await callInternal('query', internal.apiWrites.scanResult, { keyId: context.keyId, runId: id }));
    return { runId: id, runStatus: measurement?.status ?? 'running', measurement };
  });
}
