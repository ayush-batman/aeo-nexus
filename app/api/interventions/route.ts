import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { readActions, readActionEvents, readMembers } from '@/lib/convex/actions';
import { generateInsights } from '@/lib/insights';
import { actionFromInsight } from '@/lib/actions';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [interventions, events, members, insights] = await Promise.all([readActions(context.workspaceId), readActionEvents(context.workspaceId), readMembers(), generateInsights(context.workspaceId)]);
    const keys = new Set(interventions.map(item => item.insight_key));
    return NextResponse.json({ interventions, events, members, suggestions: insights.filter(item => !keys.has(`insight:${item.id}`)),
      currentUserId: context.userId, canEdit: context.role !== 'viewer' });
  } catch (error) { return convexRouteError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    let body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    if (typeof body.insight_id === 'string') {
      const insight = (await generateInsights(context.workspaceId)).find(item => item.id === body.insight_id);
      if (!insight) return NextResponse.json({ error: 'Suggestion is stale or unavailable.' }, { status: 409 });
      body = { ...actionFromInsight(insight), action_type: insight.category === 'audit' ? 'schema_add' : 'content_update' };
    }
    const requestId = request.headers.get('idempotency-key') || crypto.randomUUID();
    const intervention = await fetchAuthMutation(api.actions.save, { workspaceId: context.workspaceId, inputJson: JSON.stringify(body), requestId });
    return NextResponse.json({ intervention }, { status: 201 });
  } catch (error) { return convexRouteError(error); }
}
