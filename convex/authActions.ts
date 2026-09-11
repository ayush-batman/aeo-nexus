'use node';
import { createHash } from 'node:crypto';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { consumeAuthLimit } from './lib/authLimit';

export const consume = internalAction({
  args: { key: v.string(), window: v.number(), max: v.number() },
  returns: v.object({ allowed: v.boolean(), retryAfter: v.union(v.number(), v.null()) }),
  handler: async (ctx, args): Promise<{ allowed: boolean; retryAfter: number | null }> => {
    return consumeAuthLimit(ctx, args);
  },
});
export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), text: v.string() }, returns: v.null(),
  handler: async (_ctx, args) => {
    const key = process.env.RESEND_API_KEY, from = process.env.AELO_AUTH_EMAIL_FROM;
    if (!key || !from) throw new Error('auth_email_not_configured');
    if (args.to.length > 254 || args.subject.length > 200 || args.text.length > 10000) throw new Error('invalid_auth_email');
    // A retry of the same verification/reset link must not send another email.
    const idempotencyKey = createHash('sha256').update(JSON.stringify({ from, ...args })).digest('hex');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `auth-${idempotencyKey}` },
      body: JSON.stringify({ from, to: [args.to], subject: args.subject, text: args.text }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('auth_email_failed');
    const receipt: unknown = await response.json();
    if (!receipt || typeof receipt !== 'object' || !('id' in receipt) || typeof receipt.id !== 'string') throw new Error('auth_email_unconfirmed');
    return null;
  },
});
