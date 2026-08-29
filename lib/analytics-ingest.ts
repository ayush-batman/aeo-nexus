import { createHmac, timingSafeEqual } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/;
const MAX_METADATA_BYTES = 4_096;

export class AnalyticsIngestConfigurationError extends Error {
  constructor() {
    super('ANALYTICS_INGEST_SECRET must contain at least 32 characters.');
    this.name = 'AnalyticsIngestConfigurationError';
  }
}

export class AnalyticsInputError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'AnalyticsInputError';
  }
}

export type AnalyticsEventInput = {
  workspace_id: string;
  event_type: string;
  referrer: string | null;
  ai_source: string;
  path: string | null;
  metadata: Record<string, JsonValue>;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function signingSecret(): string {
  const secret = process.env.ANALYTICS_INGEST_SECRET?.trim() ?? '';
  if (secret.length < 32) throw new AnalyticsIngestConfigurationError();
  return secret;
}

function tokenDigest(workspaceId: string): string {
  if (!UUID_PATTERN.test(workspaceId)) throw new AnalyticsInputError('workspace_id must be a UUID.');
  return createHmac('sha256', signingSecret())
    .update(`aelo-analytics-ingest:v1:${workspaceId}`)
    .digest('base64url');
}

export function createAnalyticsIngestToken(workspaceId: string): string {
  return `v1.${tokenDigest(workspaceId)}`;
}

export function verifyAnalyticsIngestToken(workspaceId: string, token: unknown): boolean {
  if (typeof token !== 'string' || !/^v1\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  try {
    const expected = Buffer.from(createAnalyticsIngestToken(workspaceId));
    const received = Buffer.from(token);
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch (error) {
    if (error instanceof AnalyticsIngestConfigurationError) throw error;
    return false;
  }
}

function sourceFromReferrer(referrer: string | null): string {
  if (!referrer) return 'other';
  let host: string;
  try {
    const parsed = new URL(referrer);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    host = parsed.hostname.toLowerCase();
  } catch {
    throw new AnalyticsInputError('referrer must be an HTTP(S) URL.');
  }
  const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (matches('chatgpt.com') || matches('openai.com')) return 'chatgpt';
  if (matches('gemini.google.com') || matches('bard.google.com')) return 'gemini';
  if (matches('perplexity.ai')) return 'perplexity';
  if (matches('claude.ai')) return 'claude';
  if (matches('copilot.microsoft.com')) return 'copilot';
  if (matches('bing.com')) return 'bing';
  return 'other';
}

function sanitizeJson(value: unknown, depth = 0): JsonValue {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 500) throw new AnalyticsInputError('metadata strings must be 500 characters or fewer.');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new AnalyticsInputError('metadata numbers must be finite.');
    return value;
  }
  if (depth >= 2) throw new AnalyticsInputError('metadata may be nested at most two levels.');
  if (Array.isArray(value)) {
    if (value.length > 20) throw new AnalyticsInputError('metadata arrays may contain at most 20 values.');
    return value.map((entry) => sanitizeJson(entry, depth + 1));
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 20) throw new AnalyticsInputError('metadata may contain at most 20 keys.');
    const result: Record<string, JsonValue> = {};
    for (const [key, entry] of entries) {
      if (!/^[A-Za-z0-9_.-]{1,64}$/.test(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) {
        throw new AnalyticsInputError('metadata contains an invalid key.');
      }
      result[key] = sanitizeJson(entry, depth + 1);
    }
    return result;
  }
  throw new AnalyticsInputError('metadata must contain only JSON values.');
}

export function normalizeAnalyticsEvent(input: unknown): AnalyticsEventInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AnalyticsInputError('Event body must be a JSON object.');
  }
  const body = input as Record<string, unknown>;
  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id.trim() : '';
  const eventType = typeof body.event_type === 'string' ? body.event_type.trim().toLowerCase() : '';
  if (!UUID_PATTERN.test(workspaceId)) throw new AnalyticsInputError('workspace_id must be a UUID.');
  if (!EVENT_PATTERN.test(eventType)) throw new AnalyticsInputError('event_type is invalid.');

  const referrer = typeof body.referrer === 'string' && body.referrer.trim() ? body.referrer.trim() : null;
  if (referrer && referrer.length > 2_048) throw new AnalyticsInputError('referrer is too long.');
  const path = typeof body.path === 'string' && body.path.trim() ? body.path.trim() : null;
  if (path && (path.length > 2_048 || !path.startsWith('/') || /[\u0000-\u001f]/.test(path))) {
    throw new AnalyticsInputError('path is invalid.');
  }

  const metadataValue = body.metadata === undefined ? {} : sanitizeJson(body.metadata);
  if (!metadataValue || Array.isArray(metadataValue) || typeof metadataValue !== 'object') {
    throw new AnalyticsInputError('metadata must be a JSON object.');
  }
  if (Buffer.byteLength(JSON.stringify(metadataValue), 'utf8') > MAX_METADATA_BYTES) {
    throw new AnalyticsInputError('metadata is too large.');
  }
  return {
    workspace_id: workspaceId,
    event_type: eventType,
    referrer,
    ai_source: sourceFromReferrer(referrer),
    path,
    metadata: metadataValue,
  };
}

export async function readBoundedJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new AnalyticsInputError('Request body is too large.', 413);
  }
  if (!request.body) throw new AnalyticsInputError('Request body is required.');

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new AnalyticsInputError('Request body is too large.', 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new AnalyticsInputError('Request body must be valid JSON.');
  }
}
