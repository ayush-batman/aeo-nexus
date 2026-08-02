import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
    computeAndStoreSnapshots,
    detectDrift,
    weekStart,
    type DriftAlert,
} from '@/lib/analytics/sentiment-drift';
import { sendDriftAlertEmail } from '@/lib/email';

// Weekly cron: Monday 09:00 UTC (see vercel.json). Snapshots the prior
// week's average sentiment per (workspace, prompt, platform), then
// compares against the week before that. Rows with |Δ| >= 0.3 fan out
// as notifications + Resend emails.
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // "Prior week" = the completed week that just ended.
        const now = new Date();
        const thisWeek  = weekStart(now);
        const priorWeek = new Date(thisWeek);
        priorWeek.setUTCDate(priorWeek.getUTCDate() - 7);

        // Snapshot the two weeks we compare so cold-start workspaces still get
        // a baseline. computeAndStoreSnapshots is upsert, safe to re-run.
        const priorPrior = new Date(priorWeek);
        priorPrior.setUTCDate(priorPrior.getUTCDate() - 7);
        await computeAndStoreSnapshots(priorPrior);
        const { snapshots } = await computeAndStoreSnapshots(priorWeek);

        const alerts = await detectDrift(priorWeek);
        const delivered = await fanOutAlerts(alerts);

        return NextResponse.json({
            success: true,
            week: priorWeek.toISOString().slice(0, 10),
            snapshotsWritten: snapshots.length,
            alertsDetected:   alerts.length,
            alertsDelivered:  delivered,
        });
    } catch (err) {
        console.error('[cron/sentiment-drift] fatal:', err);
        return NextResponse.json({ error: 'Cron failed', detail: String(err) }, { status: 500 });
    }
}

async function fanOutAlerts(alerts: DriftAlert[]): Promise<number> {
    if (!alerts.length) return 0;
    const db = createAdminClient();
    let count = 0;

    for (const a of alerts) {
        const { data: pref } = await db
            .from('alert_preferences')
            .select('enabled')
            .eq('workspace_id', a.workspace_id)
            .eq('alert_type', 'sentiment_drift')
            .maybeSingle();

        // Opt-out only. Default = ON. Marketing teams want the signal
        // unless they've explicitly muted it.
        if (pref && pref.enabled === false) continue;

        await db.from('notifications').insert({
            workspace_id: a.workspace_id,
            type:  'sentiment_drift',
            title: driftHeadline(a),
            message: driftMessage(a),
            metadata: {
                prompt:   a.prompt,
                platform: a.platform,
                delta:    a.delta,
                current:  a.current,
                prior:    a.prior,
                sample_size: a.sample_size,
            },
        });

        const { data: members } = await db
            .from('workspaces')
            .select('org_id, users:users!users_org_id_fkey(email)')
            .eq('id', a.workspace_id)
            .maybeSingle();

        const emails: string[] = ((members as { users?: { email: string }[] } | null)?.users ?? [])
            .map(u => u.email).filter(Boolean);

        for (const to of emails) {
            await sendDriftAlertEmail(to, a).catch(err =>
                console.error('[cron/sentiment-drift] email send failed:', err));
        }
        count++;
    }
    return count;
}

function driftHeadline(a: DriftAlert): string {
    const dir = a.direction === 'up' ? 'rose' : 'dropped';
    return `Sentiment ${dir} ${Math.abs(a.delta).toFixed(2)} on ${platformLabel(a.platform)}`;
}

function driftMessage(a: DriftAlert): string {
    const dir = a.direction === 'up' ? 'improved' : 'worsened';
    return `On "${a.prompt}", your ${platformLabel(a.platform)} sentiment ${dir} from ${a.prior.toFixed(2)} to ${a.current.toFixed(2)} this week (${a.sample_size} scans).`;
}

function platformLabel(p: string): string {
    return {
        chatgpt: 'ChatGPT',
        gemini:  'Gemini',
        claude:  'Claude',
        perplexity: 'Perplexity',
        google_ai_overview: 'Google AI Overview',
    }[p] ?? p;
}
