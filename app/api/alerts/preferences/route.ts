import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';

// Default alert preferences (matching the Settings UI)
const DEFAULT_ALERTS = [
    { alert_type: 'visibility_drop', enabled: true },
    { alert_type: 'competitor_overtake', enabled: true },
    { alert_type: 'zero_visibility', enabled: true },
    { alert_type: 'new_citation', enabled: true },
    { alert_type: 'citation_lost', enabled: false },
    { alert_type: 'negative_sentiment', enabled: true },
    { alert_type: 'hot_thread', enabled: true },
    { alert_type: 'brand_forum_mention', enabled: false },
    { alert_type: 'daily_report', enabled: false },
    { alert_type: 'weekly_digest', enabled: true },
];

// GET: Load alert preferences for current workspace
export async function GET() {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('alert_preferences')
            .select('alert_type, enabled')
            .eq('workspace_id', workspaceId);

        if (error) {
            console.error('Error fetching alert preferences:', error);
            // Return defaults if table doesn't exist yet
            return NextResponse.json({ preferences: DEFAULT_ALERTS });
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
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { preferences } = await req.json();

        if (!Array.isArray(preferences)) {
            return NextResponse.json({ error: 'preferences must be an array' }, { status: 400 });
        }

        const supabase = await createClient();

        // Upsert each preference
        for (const pref of preferences) {
            const { error } = await supabase
                .from('alert_preferences')
                .upsert(
                    {
                        workspace_id: workspaceId,
                        alert_type: pref.alert_type,
                        enabled: pref.enabled,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'workspace_id,alert_type' }
                );

            if (error) {
                console.error(`Error saving alert preference ${pref.alert_type}:`, error);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Alert preferences save error:', err);
        return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }
}
