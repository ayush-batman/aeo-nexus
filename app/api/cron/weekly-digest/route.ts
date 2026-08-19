import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildReport } from '@/lib/analytics/report';
import { sendWeeklyDigestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Weekly free-tier digest (Monday 08:00 UTC, see vercel.json). For each free
// org that is still active (>=1 scan in the last 30 days), email the owner a
// 7-day AI-visibility recap with an upgrade nudge. Opt-out only. We skip
// never-active / dead accounts so we don't torch sender reputation, and skip
// paid orgs (they get drift + product touchpoints already).
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createAdminClient();
    let sent = 0, skipped = 0;

    try {
        const { data: orgs } = await db.from('organizations').select('id').eq('plan', 'free');

        for (const org of orgs ?? []) {
            const { data: wss } = await db
                .from('workspaces')
                .select('id, name, users:users!users_org_id_fkey(email)')
                .eq('org_id', (org as { id: string }).id);

            for (const ws of wss ?? []) {
                const w = ws as { id: string; name: string; users?: { email: string }[] };
                const emails = (w.users ?? []).map(u => u.email).filter(Boolean);
                if (!emails.length) { skipped++; continue; }

                // Opt-out only (default ON).
                const { data: pref } = await db
                    .from('alert_preferences')
                    .select('enabled')
                    .eq('workspace_id', w.id)
                    .eq('alert_type', 'weekly_digest')
                    .maybeSingle();
                if (pref && (pref as { enabled: boolean }).enabled === false) { skipped++; continue; }

                // Activity gate: don't email accounts that have never scanned in 30 days.
                const active = await buildReport(w.id, w.name || 'Your brand', 30);
                if (active.totalScans === 0) { skipped++; continue; }

                const weekly = await buildReport(w.id, w.name || 'Your brand', 7);
                for (const to of emails) {
                    await sendWeeklyDigestEmail(to, weekly, false).catch(e =>
                        console.error('[cron/weekly-digest] send failed:', e));
                }
                sent++;
            }
        }

        return NextResponse.json({ success: true, sent, skipped });
    } catch (err) {
        console.error('[cron/weekly-digest] fatal:', err);
        return NextResponse.json({ error: 'Cron failed', detail: String(err) }, { status: 500 });
    }
}
