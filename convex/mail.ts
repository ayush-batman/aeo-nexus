import { v } from 'convex/values';
import { Workpool,vOnCompleteArgs } from '@convex-dev/workpool';
import { internalMutation, internalQuery } from './_generated/server';
import { internal,components } from './_generated/api';
const pool=new Workpool(components.measurementWorkpool,{maxParallelism:4,retryActionsByDefault:false});
export const enqueue=internalMutation({args:{workspaceId:v.id('workspaces'),recipientId:v.id('users'),kind:v.string(),dedupeKey:v.string(),subject:v.string(),html:v.string()},returns:v.null(),handler:async(ctx,args)=>{
  if(args.html.length>200000 || args.subject.length>300 || !['weekly_digest','sentiment_drift','welcome','first_results'].includes(args.kind))throw new Error('invalid_email');
  const workspace=await ctx.db.get(args.workspaceId),user=await ctx.db.get(args.recipientId);if(!workspace || !user?.emailVerified)return null;
  const member=await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id',q=>q.eq('organizationId',workspace.organizationId).eq('userId',user._id)).unique();if(!member)return null;
  const existing=await ctx.db.query('emailDeliveries').withIndex('by_workspace_recipient_key',q=>q.eq('workspaceId',args.workspaceId).eq('recipientId',args.recipientId).eq('dedupeKey',args.dedupeKey)).unique();if(existing)return null;
  const id=await ctx.db.insert('emailDeliveries',{...args,publicId:crypto.randomUUID(),recipientEmail:user.email,status:'pending',attempts:0,firstAttemptAt:null,providerId:null,lastError:null,createdAt:Date.now(),updatedAt:Date.now()});
  await pool.enqueueAction(ctx,internal.mailActions.deliver,{id},{retry:true,onComplete:internal.mail.onComplete,context:{id}});return null;
}});
export const claim=internalMutation({args:{id:v.id('emailDeliveries')},returns:v.union(v.object({publicId:v.string(),email:v.string(),from:v.string(),subject:v.string(),html:v.string()}),v.null()),handler:async(ctx,args)=>{
  const row=await ctx.db.get(args.id);if(!row || ['sent','skipped','failed'].includes(row.status))return null;
  const workspace=await ctx.db.get(row.workspaceId),user=await ctx.db.get(row.recipientId);
  const member=workspace&&await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id',q=>q.eq('organizationId',workspace.organizationId).eq('userId',row.recipientId)).unique();
  const optionalAlert=row.kind==='weekly_digest'||row.kind==='sentiment_drift';
  const pref=optionalAlert?await ctx.db.query('alertPreferences').withIndex('by_workspace_id_and_alert_type',q=>q.eq('workspaceId',row.workspaceId).eq('alertType',row.kind)).unique():null;
  if(!member || !user?.emailVerified || user.email!==row.recipientEmail || pref?.enabled===false){await ctx.db.patch(row._id,{status:'skipped',updatedAt:Date.now()});return null;}
  // The provider only deduplicates for 24h. Never blindly resend an ambiguous
  // old delivery after that window; manual reconciliation is required.
  if(row.firstAttemptAt!==null && Date.now()-row.firstAttemptAt>=23*3600000)throw new Error('email_reconciliation_required');
  const from=row.sender??process.env.AELO_EMAIL_FROM;
  if(!from)throw new Error('email_not_configured');
  // Freeze every provider request field with the first attempt, including sender.
  await ctx.db.patch(row._id,{sender:from,status:'sending',attempts:row.attempts+1,firstAttemptAt:row.firstAttemptAt??Date.now(),updatedAt:Date.now()});
  return {publicId:row.publicId,email:row.recipientEmail,from,subject:row.subject,html:row.html};
}});
export const accepted=internalMutation({args:{id:v.id('emailDeliveries'),providerId:v.string()},returns:v.null(),handler:async(ctx,args)=>{
  const row=await ctx.db.get(args.id);if(row && row.status==='sending')await ctx.db.patch(row._id,{status:'sent',providerId:args.providerId,lastError:null,updatedAt:Date.now()});return null;
}});
export const onComplete=internalMutation({args:vOnCompleteArgs(v.object({id:v.id('emailDeliveries')})),returns:v.null(),handler:async(ctx,args)=>{
  const row=await ctx.db.get(args.context.id);if(!row || ['sent','skipped'].includes(row.status))return null;
  await ctx.db.patch(row._id,{status:'failed',lastError:'Delivery was not confirmed by the email provider.',updatedAt:Date.now()});
  await ctx.scheduler.runAfter(0,internal.measurementAlerts.insert,{workspaceId:row.workspaceId,type:row.kind,title:'Email delivery was not confirmed',message:'The message was not confirmed by the email provider. Its delivery record is preserved for support review.',dedupeKey:`email-failed:${row.publicId}`,metadata:{delivery_id:row.publicId}});
  return null;
}});

export const welcomeContext=internalQuery({
  args:{workspaceId:v.id('workspaces'),userId:v.id('users')},
  returns:v.union(v.null(),v.object({userPublicId:v.string(),firstName:v.string()})),
  handler:async(ctx,args)=>{
    const workspace=await ctx.db.get(args.workspaceId),user=await ctx.db.get(args.userId);
    if(!workspace||!user?.emailVerified)return null;
    const member=await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id',q=>q.eq('organizationId',workspace.organizationId).eq('userId',user._id)).unique();
    if(!member)return null;
    return {userPublicId:user.publicId,firstName:user.fullName?.trim().split(/\s+/)[0]||'there'};
  },
});

export const firstResultsContext=internalQuery({
  args:{packetId:v.id('decisionPackets')},
  returns:v.union(v.null(),v.object({workspaceId:v.id('workspaces'),recipientId:v.id('users'),packetPublicId:v.string(),brandName:v.string(),status:v.union(v.literal('complete'),v.literal('partial'))})),
  handler:async(ctx,args)=>{
    const packet=await ctx.db.get(args.packetId);
    if(!packet||!packet.createdBy||(packet.status!=='complete'&&packet.status!=='partial')||!packet.measurementRunIds?.length)return null;
    const runs=await Promise.all(packet.measurementRunIds.map(publicId=>ctx.db.query('measurementRuns').withIndex('by_public_id',q=>q.eq('publicId',publicId)).unique()));
    if(runs.some(run=>!run?.result||run.workspaceId!==packet.workspaceId||!['complete','partial','all_failed'].includes(run.status)||run.result.persistence.status==='failed'))return null;
    const workspace=await ctx.db.get(packet.workspaceId),user=await ctx.db.get(packet.createdBy);
    if(!workspace||!user?.emailVerified)return null;
    const member=await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id',q=>q.eq('organizationId',workspace.organizationId).eq('userId',user._id)).unique();
    if(!member)return null;
    return {workspaceId:workspace._id,recipientId:user._id,packetPublicId:packet.publicId,brandName:workspace.name,status:packet.status};
  },
});
