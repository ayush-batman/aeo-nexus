import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWeeklyDigestEmail } from '@/lib/email';
import { buildWeeklyDecisionInbox, type WeeklyActionRow, type WeeklyScanRow } from '@/lib/weekly-inbox';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const weekStart = new Date().toISOString().slice(0, 10);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const { data: workspaces, error: workspaceError } = await db
      .from('workspaces').select('id, name, org_id');
    if (workspaceError) throw workspaceError;

    for (const workspace of workspaces ?? []) {
      const [users, preference, scans, actions] = await Promise.all([
        db.from('users').select('email').eq('org_id', workspace.org_id),
        db.from('alert_preferences').select('enabled').eq('workspace_id', workspace.id).eq('alert_type', 'weekly_digest').maybeSingle(),
        db.from('llm_scans').select('prompt, platform, brand_mentioned, citations, created_at, provider_model, measurement_region, measurement_mode, scorer_version, measurement_contract_version').eq('workspace_id', workspace.id).gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString()),
        db.from('interventions').select('id, title, owner_id, target_prompts, status').eq('workspace_id', workspace.id),
      ]);
      const emails = (users.data ?? []).map(user => user.email).filter((email): email is string => Boolean(email));
      if (!emails.length || preference.data?.enabled === false || scans.error || actions.error) { skipped++; continue; }

      const inbox = buildWeeklyDecisionInbox(scans.data as WeeklyScanRow[], actions.data as WeeklyActionRow[]);
      if (inbox.items.length === 0) { skipped++; continue; }

      const claim = await db.rpc('claim_weekly_digest_delivery', {
        p_workspace_id: workspace.id,
        p_week_start: weekStart,
        p_item_count: inbox.items.length,
        p_recipient_count: emails.length,
      });
      if (claim.error || claim.data !== true) { skipped++; continue; }

      const results = await Promise.all(emails.map(email => sendWeeklyDigestEmail(email, workspace.name || 'Your brand', inbox)));
      const allSent = results.every(result => result?.success === true);
      if (allSent) {
        await db.from('weekly_digest_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
          .eq('workspace_id', workspace.id).eq('week_start', weekStart).eq('status', 'sending');
        sent++;
      } else {
        const message = results.some(result => result && 'skipped' in result && result.skipped)
          ? 'Email is not configured. The decision inbox remains available in Aelo.'
          : 'The email provider did not accept every weekly digest.';
        await db.from('weekly_digest_deliveries').update({ status: 'failed', last_error: message })
          .eq('workspace_id', workspace.id).eq('week_start', weekStart).eq('status', 'sending');
        await db.from('notifications').upsert({
          workspace_id: workspace.id,
          type: 'weekly_digest_failed',
          title: 'Weekly digest email was not sent',
          message,
          metadata: { week_start: weekStart, item_count: inbox.items.length },
          dedupe_key: `weekly-digest-failed:${weekStart}`,
        }, { onConflict: 'workspace_id,dedupe_key' });
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, skipped, failed });
  } catch (error) {
    console.error('[cron/weekly-digest] fatal:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
