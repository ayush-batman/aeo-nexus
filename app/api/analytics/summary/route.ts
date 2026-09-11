import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { fetchAuthQuery } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const events: FunctionReturnType<typeof api.traffic.events>['page'] = [];
    const sources: Record<string, number> = {};
    let totalVisits = 0, aiVisits = 0;
    let cursor: string | null = null;
    const since = Date.now() - 30 * 86400_000;
    do {
      const result: FunctionReturnType<typeof api.traffic.events> = await fetchAuthQuery(api.traffic.events, { workspaceId: context.workspaceId, since, paginationOpts: { cursor, numItems: 500 } });
      for (const event of result.page) {
        if (event.event_type !== 'pageview') continue;
        totalVisits++;
        const source = event.ai_source || 'other';
        sources[source] = (sources[source] || 0) + 1;
        if (['chatgpt', 'gemini', 'perplexity', 'claude', 'bing', 'copilot'].includes(source)) aiVisits++;
        if (events.length < 50) events.push(event);
      }
      cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);
    return NextResponse.json({ totalVisits, aiVisits, sources, events, measurementBasis: 'Observed pageview events; not verified unique people or crawler requests.' });
  } catch (error) { return convexRouteError(error); }
}
