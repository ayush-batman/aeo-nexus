'use node';
import { v } from 'convex/values';
import { createHash } from 'node:crypto';
import { action, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { createAnalyticsIngestToken, normalizeAnalyticsEvent, verifyAnalyticsIngestToken } from '../lib/analytics-ingest';
export const installToken = action({
  args: { workspaceId: v.string() }, returns: v.object({ ingestToken: v.string() }),
  handler: async (ctx, args): Promise<{ ingestToken: string }> => {
    const id = await ctx.runQuery(internal.traffic.installContext, args);
    return { ingestToken: createAnalyticsIngestToken(id) };
  },
});
export const ingest = internalAction({
  args: { body: v.string(), ip: v.string() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (Buffer.byteLength(args.body) > 16_384) throw new Error('invalid_event_size');
    const payload: unknown = JSON.parse(args.body);
    const event = normalizeAnalyticsEvent(payload);
    const token = payload && typeof payload === 'object' && 'ingest_token' in payload ? payload.ingest_token : null;
    const allowed = await ctx.runMutation(internal.abuse.check, { namespace: 'analytics-ip',
      key: createHash('sha256').update(args.ip).digest('hex'), limit: 600, interval: 60000 });
    if (!allowed.ok) throw new Error('rate_limit_exceeded');
    if (!verifyAnalyticsIngestToken(event.workspace_id, token)) throw new Error('invalid_ingest_token');
    const workspaceLimit = await ctx.runMutation(internal.abuse.check, { namespace: 'analytics-workspace', key: event.workspace_id, limit: 2000, interval: 60000 });
    if (!workspaceLimit.ok) throw new Error('rate_limit_exceeded');
    await ctx.runMutation(internal.traffic.insertVerified, { workspaceId: event.workspace_id, eventType: event.event_type,
      referrer: event.referrer, aiSource: event.ai_source, path: event.path, metadata: event.metadata });
    return null;
  },
});
