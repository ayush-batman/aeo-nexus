'use node';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { extractClaims } from '../lib/ai/claim-extractor';
import { verifyClaims } from '../lib/ai/claim-verifier';
import { extractAttributes } from '../lib/ai/attribute-extractor';

export const process = internalAction({
  args: { taskId: v.id('analysisTasks') }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!await ctx.runMutation(internal.analysis.claim, args)) return null;
    const input = await ctx.runQuery(internal.analysis.input, args);
    if (input.kind === 'accuracy') {
      const extracted = await extractClaims(input);
      const claims = await verifyClaims({ ...input, claims: extracted });
      await ctx.runMutation(internal.analysis.save, { ...args, claims, attributes: [] });
    } else {
      const attributes = await extractAttributes(input);
      await ctx.runMutation(internal.analysis.save, { ...args, claims: [], attributes });
    }
    return null;
  },
});
