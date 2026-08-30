import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { requireWorkspaceRole } from '@/lib/authorization';

// Default alert preferences (matching the Settings UI)
const DEFAULT_ALERTS = [
    { alert_type: 'visibility_drop', enabled: true },
    { alert_type: 'competitor_overtake', enabled: true },
    { alert_type: 'zero_visibility', enabled: true },
    { alert_type: 'new_citation', enabled: true },
    { alert_type: 'negative_sentiment', enabled: true },
    { alert_type: 'sentiment_drift', enabled: true },
    { alert_type: 'weekly_digest', enabled: true },
] as const;
const ALERT_TYPES = new Set(DEFAULT_ALERTS.map((alert) => alert.alert_type));

// GET: Load alert preferences for current workspace
export async function GET() {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('alert_preferences')
            .select('alert_type, enabled')
            .eq('workspace_id', context.workspaceId);

        if (error) {
            console.error('Error fetching alert preferences:', error);
            return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
        }

        // If no preferences saved yet, return defaults
        if (!data || data.length === 0) {
            return NextResponse.json({ preferences: DEFAULT_ALERTS });
        }

        // Merge with defaults for any missing alert types
        const savedMap = new Map(data.map(d => [d.alert_type, d.enabled]));
        const merged = DEFAULT_ALERTS.map(d => ({
            alert_type: d.alert_type,
            enabled: savedMap.has(d.alert_type) ? savedMap.get(d.alert_type)! : d.enabled,
        }));

        return NextResponse.json({ preferences: merged });
    } catch (err) {
        console.error('Alert preferences error:', err);
        return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
    }
}

// POST: Save alert preferences
export async function POST(req: NextRequest) {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!requireWorkspaceRole(context, ['owner', 'admin'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json().catch(() => null) as { preferences?: unknown } | null;
        const preferences = body?.preferences;

        if (!Array.isArray(preferences)) {
            return NextResponse.json({ error: 'preferences must be an array' }, { status: 400 });
        }
        const validPreferences = preferences.every((pref): pref is { alert_type: string; enabled: boolean } =>
            Boolean(pref)
            && typeof pref === 'object'
            && 'alert_type' in pref
            && typeof pref.alert_type === 'string'
            && ALERT_TYPES.has(pref.alert_type as typeof DEFAULT_ALERTS[number]['alert_type'])
            && 'enabled' in pref
            && typeof pref.enabled === 'boolean',
        );
        if (!validPreferences || new Set(preferences.map((pref) => pref.alert_type)).size !== preferences.length) {
            return NextResponse.json({ error: 'preferences contain unsupported or duplicate alert types' }, { status: 400 });
        }

        const admin = createAdminClient();
        const { error } = await admin.from('alert_preferences').upsert(
            preferences.map((pref) => ({
                workspace_id: context.workspaceId,
                alert_type: pref.alert_type,
                enabled: pref.enabled,
                updated_at: new Date().toISOString(),
            })),
            { onConflict: 'workspace_id,alert_type' },
        );
        if (error) {
            console.error('Error saving alert preferences:', error);
            return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Alert preferences save error:', err);
        return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }
}
