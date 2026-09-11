import { createHash } from 'node:crypto';

export const EXPORT_TABLES = [
  'organizations',
  'users',
  'workspaces',
  'products',
  'prompt_library',
  'llm_scans',
  'forum_threads',
  'reddit_accounts',
  'content_analyses',
  'scheduled_scans',
  'analytics_events',
  'alert_preferences',
  'notifications',
  'interventions',
  'action_events',
  'public_scans',
  'sentiment_drift_snapshots',
  'competitor_attributes',
  'accuracy_claims',
  'api_keys',
  'billing_webhook_events',
  'scan_quota_reservations',
  'decision_packets',
  'weekly_digest_deliveries',
  'measurement_jobs',
  'experiments',
  'newsletter_subscribers',
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number];

const RELATION_PUBLIC_IDS: Record<string, string> = {
  org_id: 'organizationPublicId',
  workspace_id: 'workspacePublicId',
  product_id: 'productPublicId',
  scan_id: 'scanPublicId',
  action_id: 'actionPublicId',
  forum_thread_id: 'forumThreadPublicId',
  owner_id: 'ownerPublicId',
  actor_id: 'actorPublicId',
  created_by: 'createdByPublicId',
};

const TIMESTAMP_FIELDS = new Set([
  'created_at',
  'updated_at',
  'last_used_at',
  'revoked_at',
  'last_run_at',
  'next_run_at',
  'posted_at',
  'discovered_at',
  'external_created_at',
  'last_post_at',
  'action_taken_at',
  'subscribed_at',
  'unsubscribed_at',
  'occurred_at',
  'applied_at',
  'attempted_at',
  'sent_at',
  'available_at',
  'claim_expires_at',
  'completed_at',
  'expires_at',
]);

// PostgreSQL's NUMERIC parser returns strings to avoid precision loss. These
// bounded measurement fields are represented as finite JS numbers by both apps.
const NUMERIC_FIELDS = new Set(['confidence', 'sentiment_score', 'avg_sentiment']);

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function timestampToMillis(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (value instanceof Date) {
    const millis = value.getTime();
    if (!Number.isFinite(millis)) throw new Error(`invalid_timestamp:${field}`);
    return millis;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') throw new Error(`invalid_timestamp:${field}`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`invalid_timestamp:${field}`);
  return parsed;
}

export function assertExportTargetAllowed(
  connectionString: string,
  allowProductionExport: boolean,
): void {
  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname.toLowerCase();
  } catch {
    throw new Error('invalid_supabase_connection_string');
  }

  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  if (!local && !allowProductionExport) {
    throw new Error('production_export_requires_explicit_flag');
  }
}

export function transformExportRow(
  _table: ExportTable,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (_table === 'newsletter_subscribers' && key === 'unsubscribe_token') {
      if (typeof value !== 'string' || !value) throw new Error('invalid_unsubscribe_token');
      transformed.unsubscribeTokenHash = createHash('sha256').update(value).digest('hex');
      continue;
    }
    if (key === 'id') {
      transformed.publicId = value;
      continue;
    }
    const relationKey = RELATION_PUBLIC_IDS[key];
    if (relationKey) {
      transformed[relationKey] = value;
      continue;
    }
    const targetKey = snakeToCamel(key);
    if (TIMESTAMP_FIELDS.has(key)) {
      transformed[targetKey] = timestampToMillis(value, key);
    } else if (NUMERIC_FIELDS.has(key) && typeof value === 'string') {
      const number = Number(value);
      if (!value.trim() || !Number.isFinite(number)) throw new Error(`invalid_numeric:${key}`);
      transformed[targetKey] = number;
    } else if (key === 'week_start' && value instanceof Date) {
      // pg decodes DATE at local midnight. Preserve its calendar date, not a UTC
      // conversion that could move a weekly digest into the preceding day.
      transformed[targetKey] = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    } else transformed[targetKey] = value;
  }

  return transformed;
}
