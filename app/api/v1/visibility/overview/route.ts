import { NextResponse } from 'next/server';
import { resolveApiKey } from '@/lib/api-auth';
import { getVisibilityMetrics } from '@/lib/data-access';

// GET /api/v1/visibility/overview  — honest visibility per engine.
// Backs the `get_visibility_overview` MCP tool. Every score carries its
// sample count and a confidence label, because a single-shot number lies.
export async function GET(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  // getVisibilityMetrics currently computes over a rolling 7-day window.
  const metrics = await getVisibilityMetrics(ctx.workspaceId);

  const engines = metrics.map((m) => ({
    engine: m.platform,
    visibility: m.score,
    change7d: m.change,
    samples: m.scanCount,
    mentions: m.mentionCount,
    mentionRate: m.mentionRate,
    confidence: m.confidence.level,
    confidenceInterval: m.confidence.interval,
  }));

  const tracked = engines.filter((e) => e.samples > 0);
  const overall = tracked.length
    ? Math.round(tracked.reduce((a, e) => a + e.visibility, 0) / tracked.length)
    : 0;

  return NextResponse.json({
    window: '7d',
    overall,
    engines,
    note:
      'Scores are averaged across stored samples in the window. Mention confidence is a 95% Wilson interval; low or none means more successful samples are needed.',
  });
}
