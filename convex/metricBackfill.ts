import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { upsertScanMetric } from './lib/scanMetrics';

/** Explicit, resumable repair for pre-existing Convex rows. Never runs at startup. */
export const page = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({ cursor: v.string(), done: v.boolean(), processed: v.number() }),
  handler: async (ctx, args) => {
    // Historical documents may approach 1 MiB; keep each transaction bounded.
    const result = await ctx.db.query('scans').paginate({ cursor: args.cursor, numItems: 5 });
    for (const row of result.page) await upsertScanMetric(ctx, row._id, row);
    return { cursor: result.continueCursor, done: result.isDone, processed: result.page.length };
  },
});
