// Settings only needs a recent activity receipt. Bound the number of remote
// pages so a high-traffic workspace cannot hold one HTTP request open forever.
export const MAX_TRAFFIC_SUMMARY_PAGES = 10;

type TrafficEvent = { event_type: string; ai_source: string | null };
type TrafficPage<T> = { page: T[]; isDone: boolean; continueCursor: string };

export async function summarizeTrafficEvents<T extends TrafficEvent>(
  fetchPage: (cursor: string | null) => Promise<TrafficPage<T>>,
) {
  const events: T[] = [];
  const sources: Record<string, number> = Object.create(null);
  let totalVisits = 0;
  let aiVisits = 0;
  let examinedEvents = 0;
  let cursor: string | null = null;
  const seenCursors = new Set<string>();

  for (let pageNumber = 0; pageNumber < MAX_TRAFFIC_SUMMARY_PAGES; pageNumber++) {
    const result = await fetchPage(cursor);
    examinedEvents += result.page.length;
    for (const event of result.page) {
      if (event.event_type !== 'pageview') continue;
      totalVisits++;
      const source = event.ai_source || 'other';
      sources[source] = (sources[source] || 0) + 1;
      if (['chatgpt', 'gemini', 'perplexity', 'claude', 'bing', 'copilot'].includes(source)) aiVisits++;
      if (events.length < 50) events.push(event);
    }
    if (result.isDone) return { totalVisits, aiVisits, sources, events, examinedEvents, partial: false };
    if (!result.continueCursor) throw new Error('missing_traffic_cursor');
    if (seenCursors.has(result.continueCursor)) throw new Error('repeated_traffic_cursor');
    seenCursors.add(result.continueCursor);
    cursor = result.continueCursor;
  }

  return { totalVisits, aiVisits, sources, events, examinedEvents, partial: true };
}
