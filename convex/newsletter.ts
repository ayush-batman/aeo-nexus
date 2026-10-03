import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
export const subscribe = internalMutation({
  args: { email: v.string(), source: v.union(v.string(), v.null()), unsubscribeTokenHash: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (args.source?.length ?? 0) > 40 || !/^[a-f0-9]{64}$/.test(args.unsubscribeTokenHash)) throw new Error('invalid_email');
    const row = await ctx.db.query('newsletterSubscribers').withIndex('by_normalized_email', q => q.eq('normalizedEmail', email)).unique();
    if (row) {
      // Never re-enable delivery to a bounced address. A subscription request
      // does not establish that a broken mailbox has been repaired.
      if (row.status === 'unsubscribed') await ctx.db.patch(row._id, { status: 'active', unsubscribedAt: null, subscribedAt: Date.now() });
      return null;
    }
    await ctx.db.insert('newsletterSubscribers', { publicId: crypto.randomUUID(), email, normalizedEmail: email,
      status: 'active', source: args.source, unsubscribeTokenHash: args.unsubscribeTokenHash, subscribedAt: Date.now(), unsubscribedAt: null });
    return null;
  },
});
