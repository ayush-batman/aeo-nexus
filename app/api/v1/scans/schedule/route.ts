import { withKey } from '@/lib/api-v1';

// POST /api/v1/scans/schedule  — schedule a recurring multi-sample scan.
// Measurement only: spends no credits on anyone's behalf. (schedule_scan)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return withKey(request, 'measure', async (ctx, admin) => {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) throw new Error('prompt is required');
    const freq = ['daily', 'weekly', 'monthly'].includes(String(body.frequency))
      ? String(body.frequency)
      : 'weekly';
    const { data, error } = await admin
      .from('scheduled_scans')
      .insert({
        workspace_id: ctx.workspaceId,
        prompt,
        platforms: [],
        competitors: [],
        frequency: freq,
        next_run_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();
    if (error) throw new Error('Failed to schedule scan');
    return { scheduled: data };
  });
}
