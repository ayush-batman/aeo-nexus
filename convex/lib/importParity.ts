import { remainingImportTables } from './importRecords';

export const importTableTargets = {
  organizations: 'organizations', users: 'users', workspaces: 'workspaces',
  products: 'products', llm_scans: 'scans', api_keys: 'apiKeys',
  billing_webhook_events: 'billingWebhookEvents', public_scans: 'publicScans',
  ...remainingImportTables,
} as const;
export type ImportSource = keyof typeof importTableTargets;

export function isImportSource(value: string): value is ImportSource {
  return Object.hasOwn(importTableTargets, value);
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function addImportMetrics(
  totals: Record<string, number>, source: string, row: Record<string, unknown>,
): void {
  const add = (key: string, value: number) => { totals[key] = (totals[key] ?? 0) + value; };
  add('count', 1);
  if (source === 'llm_scans' || source === 'public_scans') {
    add('mentions', row.brandMentioned === true ? 1 : 0);
    add('unknownMentions', row.brandMentioned == null ? 1 : 0);
    add('failed', row.failureCode || row.errorMessage ? 1 : 0);
    add('answers', typeof row.response === 'string' && row.response.length > 0 ? 1 : 0);
    add('citations', Array.isArray(row.citations) ? row.citations.length : 0);
  }
  if (source === 'api_keys') add(row.revokedAt == null ? 'active' : 'revoked', 1);
  if (source === 'scan_quota_reservations' && typeof row.units === 'number') add('units', row.units);
  if (source === 'sentiment_drift_snapshots' && typeof row.sampleSize === 'number') add('samples', row.sampleSize);
  if (typeof row.status === 'string') add(`status:${row.status}`, 1);
  if (source === 'organizations' && typeof row.plan === 'string') add(`plan:${row.plan}`, 1);
  if (source === 'billing_webhook_events' && typeof row.provider === 'string') add(`provider:${row.provider}`, 1);
  if (source === 'action_events' && typeof row.eventType === 'string') add(`event:${row.eventType}`, 1);
}
