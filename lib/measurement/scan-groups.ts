import type { Citation, LLMScan } from '../types';
import { estimateMentionConfidence } from './confidence';

export type RecentScanGroup = {
  key: string;
  runId: string | null;
  prompt: string;
  platforms: string[];
  sampleCount: number;
  failedSamples: number;
  mentionCount: number;
  mentionRate: number | null;
  visibilityPercent: number | null;
  confidence: ReturnType<typeof estimateMentionConfidence>;
  averageMentionPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  competitors: string[];
  citations: Citation[];
  scannedAt: string;
};

function stableMode(values: Array<'positive' | 'neutral' | 'negative'>): RecentScanGroup['sentiment'] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ordered = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  return ordered[0] && ordered[0][1] > (ordered[1]?.[1] ?? 0)
    ? ordered[0][0] as RecentScanGroup['sentiment']
    : null;
}

function groupKey(scan: LLMScan): string {
  // Canonical runs carry a shared run id. A legacy row without one remains
  // separate because combining unrelated historical rows would invent a cohort.
  return scan.measurement_run_id ? `run:${scan.measurement_run_id}` : `row:${scan.id}`;
}

/** Build honest recent-run summaries from saved sample rows. */
export function groupRecentScans(scans: readonly LLMScan[]): RecentScanGroup[] {
  const grouped = new Map<string, LLMScan[]>();
  for (const scan of scans) {
    const key = groupKey(scan);
    const rows = grouped.get(key) ?? [];
    rows.push(scan);
    grouped.set(key, rows);
  }

  return [...grouped.entries()].map(([key, rows]) => {
    const successful = rows.filter((row) => !row.failure_code);
    const mentionCount = successful.filter((row) => row.brand_mentioned).length;
    const confidence = estimateMentionConfidence(mentionCount, successful.length);
    const positions = successful.flatMap((row) =>
      row.brand_mentioned && row.mention_position !== null && row.mention_position >= 1
        ? [row.mention_position]
        : [],
    );
    const citations = new Map<string, Citation>();
    for (const citation of successful.flatMap((row) => row.citations ?? [])) {
      const current = citations.get(citation.url);
      if (!current || (current.provenance !== 'provider_citation' && citation.provenance === 'provider_citation')) {
        citations.set(citation.url, citation);
      }
    }
    const timestamps = rows.map((row) => Date.parse(row.created_at)).filter(Number.isFinite);
    return {
      key,
      runId: rows[0]?.measurement_run_id ?? null,
      prompt: rows[0]?.prompt ?? '',
      platforms: [...new Set(rows.map((row) => row.platform))],
      sampleCount: successful.length,
      failedSamples: rows.length - successful.length,
      mentionCount,
      mentionRate: confidence.mentionRate,
      visibilityPercent: confidence.mentionRate === null ? null : Math.round(confidence.mentionRate * 100),
      confidence,
      averageMentionPosition: positions.length
        ? Math.round((positions.reduce((sum, position) => sum + position, 0) / positions.length) * 10) / 10
        : null,
      sentiment: stableMode(successful.flatMap((row) => row.sentiment ? [row.sentiment] : [])),
      competitors: [...new Set(successful.flatMap((row) => row.competitors_mentioned ?? []))],
      citations: [...citations.values()],
      scannedAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : rows[0]?.created_at ?? new Date(0).toISOString(),
    };
  });
}

