'use node';
import { v } from 'convex/values';
import { Resend } from 'resend';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
export const deliver=internalAction({args:{id:v.id('emailDeliveries')},returns:v.null(),handler:async(ctx,args):Promise<null>=>{
  const input=await ctx.runMutation(internal.mail.claim,args);if(!input)return null;
  const key=process.env.RESEND_API_KEY;
  if(!key)throw new Error('email_not_configured');
  const response=await new Resend(key).emails.send({from:input.from,to:[input.email],subject:input.subject,html:input.html},{idempotencyKey:`aelo-delivery-${input.publicId}`});
  if(response.error || !response.data?.id)throw new Error('email_provider_unconfirmed');
  await ctx.runMutation(internal.mail.accepted,{id:args.id,providerId:response.data.id});return null;
}});
