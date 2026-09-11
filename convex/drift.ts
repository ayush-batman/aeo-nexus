import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation } from './_generated/server';
import { tenantQuery,requireWorkspace } from './lib/tenant';
import { nullableString,engineValidator } from './validators';
import { driftCohort } from '../lib/analytics/sentiment-model';
export const snapshotValue=v.object({workspace_id:v.string(),prompt:v.string(),platform:engineValidator,week_start:v.string(),avg_sentiment:v.number(),sample_size:v.number(),
  provider_model:nullableString,measurement_region:nullableString,measurement_mode:nullableString,scorer_version:nullableString,measurement_contract_version:nullableString,
  search_mode:nullableString,analyzer_method:nullableString,analyzer_model:nullableString,analyzer_prompt_version:nullableString});
export const history=tenantQuery({args:{workspaceId:v.string(),since:v.string(),paginationOpts:paginationOptsValidator},
  returns:v.object({page:v.array(snapshotValue),isDone:v.boolean(),continueCursor:v.string()}),
  handler:async(ctx,args)=>{
    const workspace=await requireWorkspace(ctx,ctx.tenant,args.workspaceId);
    if(ctx.tenant.organization.plan==='free')throw new Error('plan_required');
    const page=await ctx.db.query('sentimentDriftSnapshots').withIndex('by_workspace_id_and_week_start',q=>q.eq('workspaceId',workspace._id).gte('weekStart',args.since))
      .paginate({...args.paginationOpts,numItems:Math.min(100,args.paginationOpts.numItems)});
    return {page:page.page.map(s=>({workspace_id:args.workspaceId,prompt:s.prompt,platform:s.platform,week_start:s.weekStart,avg_sentiment:s.avgSentiment,sample_size:s.sampleSize,
      provider_model:s.providerModel,measurement_region:s.measurementRegion,measurement_mode:s.measurementMode,scorer_version:s.scorerVersion,measurement_contract_version:s.measurementContractVersion,
      search_mode:s.searchMode??null,analyzer_method:s.analyzerMethod??null,analyzer_model:s.analyzerModel??null,analyzer_prompt_version:s.analyzerPromptVersion??null})),isDone:page.isDone,continueCursor:page.continueCursor};
  }});
export const save=internalMutation({args:{jobId:v.id('weeklyJobs'),snapshots:v.array(snapshotValue)},returns:v.null(),handler:async(ctx,args)=>{
  if(args.snapshots.length>20)throw new Error('invalid_snapshot_batch');
  const job=await ctx.db.get(args.jobId);const workspace=job&&await ctx.db.get(job.workspaceId);
  if(!job || job.kind!=='sentiment_drift' || !workspace)throw new Error('weekly_job_not_found');
  for(const s of args.snapshots){
    const cohortKey=driftCohort(s);
    if(s.workspace_id!==workspace.publicId || !cohortKey || !Number.isSafeInteger(s.sample_size) || s.sample_size<1 || !Number.isFinite(s.avg_sentiment) || Math.abs(s.avg_sentiment)>1 ||
      !['standard','battle'].includes(s.measurement_mode||''))throw new Error('invalid_snapshot');
    const existing=await ctx.db.query('sentimentDriftSnapshots').withIndex('by_workspace_cohort_week',q=>q.eq('workspaceId',workspace._id).eq('cohortKey',cohortKey).eq('weekStart',s.week_start)).unique();
    const value={publicId:existing?.publicId??crypto.randomUUID(),workspaceId:workspace._id,cohortKey,prompt:s.prompt,platform:s.platform,weekStart:s.week_start,avgSentiment:s.avg_sentiment,
      sampleSize:s.sample_size,providerModel:s.provider_model,measurementRegion:s.measurement_region,measurementMode:s.measurement_mode==='standard'?'standard' as const:'battle' as const,
      scorerVersion:s.scorer_version,measurementContractVersion:s.measurement_contract_version,searchMode:s.search_mode,analyzerMethod:s.analyzer_method,analyzerModel:s.analyzer_model,
      analyzerPromptVersion:s.analyzer_prompt_version,createdAt:existing?.createdAt??Date.now()};
    if(existing)await ctx.db.replace(existing._id,value);else await ctx.db.insert('sentimentDriftSnapshots',value);
  }
  return null;
}});
