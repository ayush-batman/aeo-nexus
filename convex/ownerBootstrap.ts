import { internalMutation } from './_generated/server';

/** One-time repair for users provisioned before the first-login admin bootstrap fix. */
export const repairConfiguredOwner = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_normalized_email', (q) => q.eq('normalizedEmail', 'work.ayushg@gmail.com'))
      .unique();
    if (!user) return { status: 'not_found' as const };
    if (!user.isSuperAdmin) {
      await ctx.db.patch(user._id, { isSuperAdmin: true, updatedAt: Date.now() });
    }
    return { status: 'ready' as const, publicId: user.publicId };
  },
});
