import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildWeeklyDecisionInbox, type WeeklyActionRow, type WeeklyScanRow } from '@/lib/weekly-inbox';

export const dynamic = 'force-dynamic';

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createAdminClient();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const [scans, actions, members] = await Promise.all([
    db.from('llm_scans').select('prompt, platform, brand_mentioned, citations, created_at, provider_model, measurement_region, measurement_mode, scorer_version, measurement_contract_version').eq('workspace_id', context.workspaceId).gte('created_at', since),
    db.from('interventions').select('id, title, owner_id, target_prompts, status').eq('workspace_id', context.workspaceId),
    db.from('users').select('id, full_name, email').eq('org_id', context.orgId),
  ]);
  if (scans.error || actions.error || members.error) {
    console.error('[decision-inbox] load failed:', scans.error ?? actions.error ?? members.error);
    return NextResponse.json({ error: 'Failed to load the weekly inbox.' }, { status: 500 });
  }
  const inbox = buildWeeklyDecisionInbox(scans.data as WeeklyScanRow[], actions.data as WeeklyActionRow[]);
  const memberNames = Object.fromEntries((members.data ?? []).map(member => [member.id, member.full_name || member.email]));
  return NextResponse.json({ ...inbox, memberNames });
}
