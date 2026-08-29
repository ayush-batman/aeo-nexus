import { withKey } from '@/lib/api-v1';
import { getVisibilityMetrics } from '@/lib/data-access';
import { mentionMetricFromCounts } from '@/lib/measurement/metrics';

// GET /api/v1/visibility/overview  — honest visibility per engine.
// Backs the `get_visibility_overview` MCP tool. Every score carries its
// sample count and a confidence label, because a single-shot number lies.
export async function GET(request: Request) {
  return withKey(request, 'read', async (ctx) => {
    const metrics = await getVisibilityMetrics(ctx.workspaceId);
    const engines = metrics.map((m) => ({
      engine: m.platform,
      visibility: m.score,
      change7d: m.change,
      changeStatus: m.changeStatus,
      samples: m.scanCount,
      mentions: m.mentionCount,
      mentionRate: m.mentionRate,
      confidence: m.confidence.level,
      confidenceInterval: m.confidence.interval,
    }));
    const totalSamples = metrics.reduce((sum, metric) => sum + metric.scanCount, 0);
    const totalMentions = metrics.reduce((sum, metric) => sum + metric.mentionCount, 0);
    const overall = mentionMetricFromCounts(totalMentions, totalSamples);

    return {
      window: '7d',
      status: overall.status,
      overall: overall.visibilityPercent,
      samples: overall.samples,
      mentions: overall.mentions,
      confidence: overall.confidence.level,
      confidenceInterval: overall.confidence.interval,
      engines,
      note:
        'Visibility is the brand mention rate across successful samples. A 7-day change appears only for matched cohorts with at least four samples in both periods.',
    };
  });
}
