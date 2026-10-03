import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery, fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ preferences: await fetchAuthQuery(api.alerts.preferences, { workspaceId: context.workspaceId }) });
  } catch (error) { return convexRouteError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const preferences = body?.preferences;
    if (!Array.isArray(preferences) || preferences.length > 7 || preferences.some(p => !p || typeof p.alert_type !== 'string' || typeof p.enabled !== 'boolean')) {
      return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
    }
    await fetchAuthMutation(api.alerts.savePreferences, { workspaceId: context.workspaceId, preferences });
    return NextResponse.json({ success: true });
  } catch (error) { return convexRouteError(error); }
}
