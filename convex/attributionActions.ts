'use node';
import { v } from 'convex/values';
import { createHash } from 'node:crypto';
import { action, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { normalizeAnalyticsEvent, verifyAnalyticsIngestToken } from '../lib/analytics-ingest';
import { ATTRIBUTION_SOURCES } from '../lib/attribution';
function normalize(body: string) {
  if (Buffer.byteLength(body) > 16384) throw new Error('invalid_event_size');
  const input: unknown = JSON.parse(body);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_event');
  const data = input as Record<string, unknown>;
  if (typeof data.source !== 'string' || !ATTRIBUTION_SOURCES.includes(data.source) ||
    (data.customSource !== undefined && data.customSource !== null && (typeof data.customSource !== 'string' || data.customSource.length > 500))) throw new Error('invalid_event');
  const event = normalizeAnalyticsEvent({ workspace_id: data.workspaceId, event_type: 'attribution_survey', referrer: null, path: null,
    metadata: { source: data.source, customSource: data.customSource ?? null } });
  return { event, token: data.ingestToken };
}
export const submit = action({
  args: { body: v.string() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { event } = normalize(args.body);
    await ctx.runQuery(internal.traffic.installContext, { workspaceId: event.workspace_id });
    const allowed = await ctx.runMutation(internal.abuse.check, { namespace: 'survey-workspace', key: event.workspace_id, limit: 100, interval: 60000 });
    if (!allowed.ok) throw new Error('rate_limit_exceeded');
    await ctx.runMutation(internal.traffic.insertVerified, { workspaceId: event.workspace_id, eventType: event.event_type,
      aiSource: event.ai_source, referrer: null, path: null, metadata: event.metadata });
    return null;
  },
});
export const submitPublic = internalAction({
  args: { body: v.string(), ip: v.string() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { event, token } = normalize(args.body);
    const limit = await ctx.runMutation(internal.abuse.check, { namespace: 'survey-ip', key: createHash('sha256').update(args.ip).digest('hex'), limit: 20, interval: 3600000 });
    if (!limit.ok) throw new Error('rate_limit_exceeded');
    if (!verifyAnalyticsIngestToken(event.workspace_id, token)) throw new Error('invalid_ingest_token');
    const allowed = await ctx.runMutation(internal.abuse.check, { namespace: 'survey-workspace', key: event.workspace_id, limit: 100, interval: 60000 });
    if (!allowed.ok) throw new Error('rate_limit_exceeded');
    await ctx.runMutation(internal.traffic.insertVerified, { workspaceId: event.workspace_id, eventType: event.event_type,
      aiSource: event.ai_source, referrer: null, path: null, metadata: event.metadata });
    return null;
  },
});
