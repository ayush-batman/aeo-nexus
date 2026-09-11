'use node';
import { createHmac } from 'node:crypto';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { scanLLM } from '../lib/ai/llm-scanner';
export const start = internalAction({
  args: { id: v.string(), ip: v.string(), brandName: v.string(), prompt: v.string() }, returns: v.object({ id: v.string(), used: v.number() }),
  handler: async (ctx, args): Promise<{ id: string; used: number }> => {
    const salt = process.env.PUBLIC_SCAN_IP_SALT;
    if (!salt || salt.length < 16) throw new Error('public_scan_not_configured');
    // Do not include user-agent: changing a browser header must not reset quota.
    const ipHash = createHmac('sha256', salt).update(args.ip).digest('hex');
    return ctx.runMutation(internal.publicScans.reserve, { id: args.id, ipHash, brandName: args.brandName, prompt: args.prompt });
  },
});
export const execute = internalAction({
  args: { id: v.id('publicScans') }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const input = await ctx.runMutation(internal.publicScans.claim, args);
    if (!input) return null;
    try {
      const output = await scanLLM({ ...input, platforms: ['gemini'], competitors: [] });
      const result = output.results.find(r => r.platform === 'gemini') ?? null;
      if (result && Buffer.byteLength(JSON.stringify(result)) > 200_000) throw new Error('provider_evidence_too_large');
      await ctx.runMutation(internal.publicScans.finish, { id: args.id, result });
    } catch { await ctx.runMutation(internal.publicScans.finish, { id: args.id, result: null }); }
    return null;
  },
});
