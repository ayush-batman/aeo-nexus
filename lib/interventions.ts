import type { LLMScan } from './types';
import type { ComparableSnapshot } from './measurement/comparison';
export type VisibilitySnapshot = ComparableSnapshot;
const fields = ['provider_model', 'measurement_region', 'measurement_mode', 'scorer_version', 'measurement_contract_version',
  'search_mode', 'analyzer_method', 'analyzer_model', 'analyzer_prompt_version'] as const;
export type SnapshotObservation = Pick<LLMScan, 'prompt' | 'platform' | 'brand_mentioned' | 'mention_position' | 'sentiment' | 'created_at' | typeof fields[number]> & { hasEvidence: boolean };
/** Latest compatible cohort, at most eight real observations per prompt/engine. */
export function snapshotFromScans(scans: LLMScan[], prompts: string[]): VisibilitySnapshot {
  return snapshotFromObservations(scans.map(scan => ({ ...scan, hasEvidence: !scan.failure_code && Boolean(scan.response.trim()) })), prompts);
}
export function snapshotFromObservations(scans: SnapshotObservation[], prompts: string[]): VisibilitySnapshot {
  const out: VisibilitySnapshot = Object.fromEntries(prompts.map(p => [p, {}]));
  const groups = new Map<string, SnapshotObservation[]>();
  const chosen = new Map<string, string>();
  for (const scan of [...scans].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    if (!prompts.includes(scan.prompt) || !scan.hasEvidence) continue;
    const base = JSON.stringify([scan.prompt, scan.platform]);
    const cohort = JSON.stringify(fields.map(field => scan[field]));
    if (!chosen.has(base)) chosen.set(base, cohort);
    if (chosen.get(base) !== cohort) continue;
    const rows = groups.get(base) ?? [];
    if (rows.length < 8) rows.push(scan);
    groups.set(base, rows);
  }
  for (const rows of groups.values()) {
    const first = rows[0];
    const mentions = rows.filter(row => row.brand_mentioned).length;
    const positions = rows.flatMap(row => row.brand_mentioned && typeof row.mention_position === 'number' && Number.isFinite(row.mention_position) && row.mention_position >= 1 ? [row.mention_position] : []);
    const sentiments = new Map<string, number>();
    for (const row of rows) if (row.sentiment) sentiments.set(row.sentiment, (sentiments.get(row.sentiment) || 0) + 1);
    const ordered = [...sentiments].sort((a,b) => b[1]-a[1]);
    out[first.prompt][first.platform] = {
      mentioned: mentions / rows.length >= 0.5, position: positions.length ? positions.reduce((a,b) => a+b,0) / positions.length : null,
      sentiment: ordered[0] && ordered[0][1] > (ordered[1]?.[1] || 0) ? ordered[0][0] : null,
      sample_count: rows.length, mention_count: mentions, mention_rate: mentions / rows.length, position_sample_count: positions.length,
      measured_at: first.created_at,
      ...Object.fromEntries(fields.flatMap(field => first[field] ? [[field === 'measurement_contract_version' ? 'contract_version' : field, first[field]]] : [])),
    };
  }
  return out;
}
