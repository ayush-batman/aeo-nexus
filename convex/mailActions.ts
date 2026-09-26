'use node';
import { v } from 'convex/values';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import WelcomeEmail from '../components/emails/WelcomeEmail';
import FirstResultsEmail from '../components/emails/FirstResultsEmail';

function siteOrigin(): string {
  const raw = process.env.SITE_URL;
  if (!raw) throw new Error('email_site_url_not_configured');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('email_site_url_not_configured'); }
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('email_site_url_not_configured');
  }
  return url.origin;
}

export const welcome = internalAction({
  args: { workspaceId: v.id('workspaces'), userId: v.id('users') }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(internal.mail.welcomeContext, args);
    if (!context) return null;
    const html = await render(WelcomeEmail({ firstName: context.firstName, baseUrl: siteOrigin() }));
    await ctx.runMutation(internal.mail.enqueue, { workspaceId: args.workspaceId, recipientId: args.userId,
      kind: 'welcome', dedupeKey: `welcome:${context.userPublicId}`, subject: 'Your Aelo workspace is ready', html });
    return null;
  },
});

export const firstResults = internalAction({
  args: { packetId: v.id('decisionPackets') }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(internal.mail.firstResultsContext, args);
    if (!context) return null;
    const html = await render(FirstResultsEmail({ brandName: context.brandName, status: context.status, baseUrl: siteOrigin() }));
    const subjectBrand = context.brandName.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    await ctx.runMutation(internal.mail.enqueue, { workspaceId: context.workspaceId, recipientId: context.recipientId,
      kind: 'first_results', dedupeKey: `first-results:${context.packetPublicId}`,
      subject: context.status === 'partial' ? `${subjectBrand}: first results are partial` : `${subjectBrand}: first results are ready`, html });
    return null;
  },
});
export const deliver=internalAction({args:{id:v.id('emailDeliveries')},returns:v.null(),handler:async(ctx,args):Promise<null>=>{
  const input=await ctx.runMutation(internal.mail.claim,args);if(!input)return null;
  const key=process.env.RESEND_API_KEY;
  if(!key)throw new Error('email_not_configured');
  const response=await new Resend(key).emails.send({from:input.from,to:[input.email],subject:input.subject,html:input.html},{idempotencyKey:`aelo-delivery-${input.publicId}`});
  if(response.error || !response.data?.id)throw new Error('email_provider_unconfirmed');
  await ctx.runMutation(internal.mail.accepted,{id:args.id,providerId:response.data.id});return null;
}});
