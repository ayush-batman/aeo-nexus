import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { tenantQuery, tenantMutation, requireWorkspace, requireRole } from './lib/tenant';

export const alertTypes = ['visibility_drop', 'competitor_overtake', 'zero_visibility', 'new_citation', 'negative_sentiment', 'sentiment_drift', 'weekly_digest'];
const preference = v.object({ alert_type: v.string(), enabled: v.boolean() });
export const preferences = tenantQuery({
  args: { workspaceId: v.string() }, returns: v.array(preference),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    return Promise.all(alertTypes.map(async alertType => {
      const saved = await ctx.db.query('alertPreferences').withIndex('by_workspace_id_and_alert_type', q => q.eq('workspaceId', workspace._id).eq('alertType', alertType)).unique();
      return { alert_type: alertType, enabled: saved?.enabled ?? true };
    }));
  },
});
export const savePreferences = tenantMutation({
  args: { workspaceId: v.string(), preferences: v.array(preference) }, returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'admin');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    if (args.preferences.length > alertTypes.length || args.preferences.some(p => !alertTypes.includes(p.alert_type)) ||
      new Set(args.preferences.map(p => p.alert_type)).size !== args.preferences.length) throw new Error('invalid_preferences');
    for (const pref of args.preferences) {
      const saved = await ctx.db.query('alertPreferences').withIndex('by_workspace_id_and_alert_type', q => q.eq('workspaceId', workspace._id).eq('alertType', pref.alert_type)).unique();
      if (saved) await ctx.db.patch(saved._id, { enabled: pref.enabled, updatedAt: Date.now() });
      else await ctx.db.insert('alertPreferences', { publicId: crypto.randomUUID(), workspaceId: workspace._id,
        alertType: pref.alert_type, enabled: pref.enabled, createdAt: Date.now(), updatedAt: Date.now() });
    }
    return null;
  },
});
export const notifications = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.string(), workspace_id: v.string(), type: v.string(), title: v.string(),
    message: v.string(), read: v.boolean(), metadata: v.any(), created_at: v.string() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const result = await ctx.db.query('notifications').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id))
      .order('desc').paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    return { isDone: result.isDone, continueCursor: result.continueCursor,
      page: result.page.map(n => ({ id: n.publicId, workspace_id: args.workspaceId, type: n.type,
        title: n.title, message: n.message, read: n.read, metadata: n.metadata, created_at: new Date(n.createdAt).toISOString() })) };
  },
});
export const markRead = tenantMutation({
  args: { workspaceId: v.string(), ids: v.array(v.string()), markAllRead: v.boolean() }, returns: v.object({ more: v.boolean() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    if (args.ids.length > 100 || (!args.markAllRead && !args.ids.length)) throw new Error('invalid_notifications');
    if (args.markAllRead) {
      const unread = await ctx.db.query('notifications').withIndex('by_workspace_id_and_read', q => q.eq('workspaceId', workspace._id).eq('read', false)).take(100);
      for (const notification of unread) await ctx.db.patch(notification._id, { read: true });
      return { more: unread.length === 100 };
    }
    for (const id of args.ids) {
      const notification = await ctx.db.query('notifications').withIndex('by_public_id', q => q.eq('publicId', id)).unique();
      if (!notification || notification.workspaceId !== workspace._id) throw new Error('notification_not_found');
      await ctx.db.patch(notification._id, { read: true });
    }
    return { more: false };
  },
});
