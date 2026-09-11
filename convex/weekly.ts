import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { Workpool,vOnCompleteArgs } from '@convex-dev/workpool';
import { internalMutation,internalQuery } from './_generated/server';
import { components,internal } from './_generated/api';
import { nullableString,nullableNumber,engineValidator } from './validators';
import { weekStart } from '../lib/analytics/sentiment-model';
const kind=v.union(v.literal('weekly_digest'),v.literal('sentiment_drift'));
const pool=new Workpool(components.measurementWorkpool,{maxParallelism:4,retryActionsByDefault:false});
export const dispatch=internalMutation({args:{kind,cursor:v.optional(v.string()),asOf:v.optional(v.number())},returns:v.number(),handler:async(ctx,args):Promise<number>=>{
  const asOf=args.asOf??weekStart(new Date()).getTime();
  const page=await ctx.db.query('workspaces').paginate({numItems:20,cursor:args.cursor??null});
  let count=0;
  for(const workspace of page.page){
    const org=await ctx.db.get(workspace.organizationId);
    if(!org || (args.kind==='sentiment_drift' && org.plan==='free'))continue;
    if(args.kind==='weekly_digest'){
      const old=await ctx.db.query('weeklyDigestDeliveries').withIndex('by_workspace_id_and_week_start',q=>q.eq('workspaceId',workspace._id).eq('weekStart',new Date(asOf).toISOString().slice(0,10))).unique();
      if(old?.status==='sent')continue;
    }
    const existing=await ctx.db.query('weeklyJobs').withIndex('by_workspace_kind_week',q=>q.eq('workspaceId',workspace._id).eq('kind',args.kind).eq('weekStart',asOf)).unique();
    if(existing)continue;
    const jobId=await ctx.db.insert('weeklyJobs',{workspaceId:workspace._id,kind:args.kind,weekStart:asOf,status:'queued',lastError:null,createdAt:Date.now(),updatedAt:Date.now()});
    await pool.enqueueAction(ctx,internal.weeklyActions.process,{jobId},{retry:true,onComplete:internal.weekly.onComplete,context:{jobId}});count++;
  }
  if(!page.isDone)await ctx.scheduler.runAfter(0,internal.weekly.dispatch,{...args,asOf,cursor:page.continueCursor});
  return count;
}});
export const context=internalQuery({args:{jobId:v.id('weeklyJobs')},returns:v.object({workspaceId:v.id('workspaces'),publicWorkspaceId:v.string(),name:v.string(),kind,asOf:v.number(),enabled:v.boolean()}),handler:async(ctx,args)=>{
  const job=await ctx.db.get(args.jobId);const workspace=job&&await ctx.db.get(job.workspaceId);const org=workspace&&await ctx.db.get(workspace.organizationId);
  if(!job || !workspace || !org)throw new Error('weekly_job_not_found');
  const pref=await ctx.db.query('alertPreferences').withIndex('by_workspace_id_and_alert_type',q=>q.eq('workspaceId',workspace._id).eq('alertType',job.kind)).unique();
  return {workspaceId:workspace._id,publicWorkspaceId:workspace.publicId,name:workspace.name,kind:job.kind,asOf:job.weekStart,
    enabled:pref?.enabled!==false && (job.kind!=='sentiment_drift'||org.plan!=='free')};
}});
export const claim=internalMutation({args:{jobId:v.id('weeklyJobs')},returns:v.boolean(),handler:async(ctx,args)=>{
  const job=await ctx.db.get(args.jobId);if(!job || job.status==='complete')return false;
  await ctx.db.patch(job._id,{status:'running',updatedAt:Date.now()});return true;
}});
const scan=v.object({workspace_id:v.string(),prompt:v.string(),platform:engineValidator,brand_mentioned:v.boolean(),created_at:v.string(),sentiment_score:nullableNumber,
  citations:v.array(v.object({url:v.string(),provenance:v.string()})),provider_model:nullableString,measurement_region:nullableString,measurement_mode:nullableString,
  scorer_version:nullableString,measurement_contract_version:nullableString,search_mode:nullableString,analyzer_method:nullableString,analyzer_model:nullableString,analyzer_prompt_version:nullableString});
export const scans=internalQuery({args:{jobId:v.id('weeklyJobs'),paginationOpts:paginationOptsValidator},returns:v.object({page:v.array(scan),isDone:v.boolean(),continueCursor:v.string()}),handler:async(ctx,args)=>{
  const job=await ctx.db.get(args.jobId);const workspace=job&&await ctx.db.get(job.workspaceId);if(!job || !workspace)throw new Error('weekly_job_not_found');
  const page=await ctx.db.query('scans').withIndex('by_workspace_id_and_created_at',q=>q.eq('workspaceId',workspace._id).gte('createdAt',job.weekStart-14*86400000).lt('createdAt',job.weekStart))
    .paginate({...args.paginationOpts,numItems:Math.min(10,args.paginationOpts.numItems)});
  return {page:page.page.filter(s=>!s.failureCode && s.response.trim()).map(s=>({workspace_id:workspace.publicId,prompt:s.prompt,platform:s.platform,brand_mentioned:s.brandMentioned,
    created_at:new Date(s.createdAt).toISOString(),sentiment_score:s.sentimentScore,citations:s.citations.map(c=>({url:c.url,provenance:c.provenance})),provider_model:s.providerModel,
    measurement_region:s.measurementRegion,measurement_mode:s.measurementMode,scorer_version:s.scorerVersion,measurement_contract_version:s.measurementContractVersion,
    search_mode:s.searchMode??null,analyzer_method:s.analyzerMethod,analyzer_model:s.analyzerModel,analyzer_prompt_version:s.analyzerPromptVersion??null})),isDone:page.isDone,continueCursor:page.continueCursor};
}});
export const actions=internalQuery({args:{jobId:v.id('weeklyJobs'),paginationOpts:paginationOptsValidator},returns:v.object({page:v.array(v.object({id:v.string(),title:v.string(),owner_id:nullableString,target_prompts:v.array(v.string()),status:v.string()})),isDone:v.boolean(),continueCursor:v.string()}),handler:async(ctx,args)=>{
  const job=await ctx.db.get(args.jobId);if(!job)throw new Error('weekly_job_not_found');
  const result=await ctx.db.query('actions').withIndex('by_workspace_id_and_created_at',q=>q.eq('workspaceId',job.workspaceId)).paginate({...args.paginationOpts,numItems:Math.min(20,args.paginationOpts.numItems)});
  const page=await Promise.all(result.page.map(async row=>({id:row.publicId,title:row.title,owner_id:row.ownerId?(await ctx.db.get(row.ownerId))?.publicId??null:null,target_prompts:row.targetPrompts,status:row.status})));
  return {page,isDone:result.isDone,continueCursor:result.continueCursor};
}});
export const recipients=internalQuery({args:{jobId:v.id('weeklyJobs'),paginationOpts:paginationOptsValidator},returns:v.object({page:v.array(v.id('users')),isDone:v.boolean(),continueCursor:v.string()}),handler:async(ctx,args)=>{
  const job=await ctx.db.get(args.jobId);const workspace=job&&await ctx.db.get(job.workspaceId);if(!workspace)throw new Error('weekly_job_not_found');
  const result=await ctx.db.query('memberships').withIndex('by_organization_id',q=>q.eq('organizationId',workspace.organizationId)).paginate({...args.paginationOpts,numItems:Math.min(50,args.paginationOpts.numItems)});
  const page=[];for(const member of result.page){const user=await ctx.db.get(member.userId);if(user?.emailVerified)page.push(user._id);}
  return {page,isDone:result.isDone,continueCursor:result.continueCursor};
}});
export const onComplete=internalMutation({args:vOnCompleteArgs(v.object({jobId:v.id('weeklyJobs')})),returns:v.null(),handler:async(ctx,args)=>{
  const job=await ctx.db.get(args.context.jobId);if(!job)return null;
  await ctx.db.patch(job._id,{status:args.result.kind==='success'?'complete':'failed',lastError:args.result.kind==='success'?null:'Weekly preparation failed. Evidence was preserved.',updatedAt:Date.now()});
  if(args.result.kind!=='success')await ctx.scheduler.runAfter(0,internal.measurementAlerts.insert,{workspaceId:job.workspaceId,type:job.kind,title:'Weekly report preparation failed',message:'Your existing evidence is safe. The weekly report could not be prepared.',dedupeKey:`weekly-job-failed:${job._id}`,metadata:{week_start:job.weekStart}});
  return null;
}});
