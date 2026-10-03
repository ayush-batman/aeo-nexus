'use node';
import { v } from 'convex/values';
import { action, internalAction, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { checkCrawlerAccess, type CrawlerAccess } from '../lib/crawlers/access';
import type { FunctionReturnType } from 'convex/server';

const output = v.object({ website: v.union(v.string(), v.null()),
  access: v.object({ ok: v.boolean(), robotsFound: v.boolean(), results: v.array(v.object({ bot: v.string(), feeds: v.string(), allowed: v.boolean() })), blockedCount: v.number() }),
  traffic: v.object({ total: v.number(), sources: v.array(v.object({ source: v.string(), count: v.number() })), hasPixelData: v.boolean(), partial: v.boolean() }) });
type Report = { website: string | null; access: CrawlerAccess; traffic: { total: number; sources: { source: string; count: number }[]; hasPixelData: boolean; partial: boolean } };

const MAX_TRAFFIC_EVENTS = 10_000;

async function report(ctx: ActionCtx, args: { workspaceId: string; keyId?: string }): Promise<Report> {
  const { website } = await ctx.runQuery(internal.crawlerData.workspace, args);
  const access = await checkCrawlerAccess(website);
  const since = Date.now() - 30 * 86400000;
  const counts = new Map<string, number>();
  let cursor: string | null = null;
  let totalEvents = 0;
  let partial = false;
  do {
    const page: FunctionReturnType<typeof internal.crawlerData.trafficPage> = await ctx.runQuery(internal.crawlerData.trafficPage, {
      ...args, since, paginationOpts: { numItems: 1000, cursor },
    });
    totalEvents += page.totalEvents;
    for (const source of page.sources) counts.set(source, (counts.get(source) ?? 0) + 1);
    partial = !page.isDone && totalEvents >= MAX_TRAFFIC_EVENTS;
    cursor = page.isDone || partial ? null : page.continueCursor;
  } while (cursor);
  const sources = [...counts].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  return { website, access, traffic: { total: sources.reduce((sum, row) => sum + row.count, 0), sources,
    hasPixelData: totalEvents > 0, partial } };
}
export const current = action({ args: { workspaceId: v.string() }, returns: output, handler: report });
export const forKey = internalAction({ args: { workspaceId: v.string(), keyId: v.string() }, returns: output, handler: report });
