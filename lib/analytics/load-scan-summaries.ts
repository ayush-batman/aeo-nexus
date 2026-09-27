export const MAX_ANALYTICS_SAMPLES = 10_000;

export type ScanSummaryPage<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};

export async function loadScanSummaries<T>(
  fetchPage: (cursor: string | null) => Promise<ScanSummaryPage<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  do {
    const result = await fetchPage(cursor);
    if (!Array.isArray(result.page) || typeof result.isDone !== 'boolean' ||
        typeof result.continueCursor !== 'string') throw new Error('Invalid scan summary response.');
    rows.push(...result.page);
    if (rows.length > MAX_ANALYTICS_SAMPLES) throw new Error('Too many samples to show accurately. Choose a shorter period.');
    if (result.isDone) return rows;
    if (!result.continueCursor || seenCursors.has(result.continueCursor) ||
        rows.length >= MAX_ANALYTICS_SAMPLES) {
      throw new Error('Cannot show complete scan history. Choose a shorter period or retry.');
    }
    seenCursors.add(result.continueCursor);
    cursor = result.continueCursor;
  } while (cursor);
  return rows;
}
