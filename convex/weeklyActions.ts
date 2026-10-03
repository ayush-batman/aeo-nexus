'use node';
import { v } from 'convex/values';
import { createHash } from 'node:crypto';
import { render } from '@react-email/components';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { buildWeeklyDecisionInbox } from '../lib/weekly-inbox';
import { computeSnapshots,detectDrift } from '../lib/analytics/sentiment-model';
import WeeklyDigestEmail from '../components/emails/WeeklyDigestEmail';
import SentimentDriftEmail from '../components/emails/SentimentDriftEmail';

export const process=internalAction({args:{jobId:v.id('weeklyJobs')},returns:v.null(),handler:async(ctx,args):Promise<null>=>{
  if(!await ctx.runMutation(internal.weekly.claim,args))return null;
  const context=await ctx.runQuery(internal.weekly.context,args);
  if(!context.enabled)return null;
  const scans:FunctionReturnType<typeof internal.weekly.scans>['page']=[];
  let cursor:string|null=null;
  do{
    const page:FunctionReturnType<typeof internal.weekly.scans>=await ctx.runQuery(internal.weekly.scans,{...args,paginationOpts:{cursor,numItems:10}});
    scans.push(...page.page);cursor=page.isDone?null:page.continueCursor;
  }while(cursor);
  const messages:{subject:string;html:string;key:string}[]=[];
  if(context.kind==='weekly_digest'){
    const actions:FunctionReturnType<typeof internal.weekly.actions>['page']=[];
    do{
      const page:FunctionReturnType<typeof internal.weekly.actions>=await ctx.runQuery(internal.weekly.actions,{...args,paginationOpts:{cursor,numItems:20}});
      actions.push(...page.page);cursor=page.isDone?null:page.continueCursor;
    }while(cursor);
    const inbox=buildWeeklyDecisionInbox(scans,actions,new Date(context.asOf));
    if(inbox.items.length)messages.push({subject:`${context.name}: ${inbox.items.length} evidence-qualified changes`,
      html:await render(WeeklyDigestEmail({brand:context.name,inbox})),key:`weekly-digest:${context.asOf}`});
  }else{
    const prior=new Date(context.asOf-7*86400000),before=new Date(context.asOf-14*86400000);
    const snapshots=[...computeSnapshots(scans,before),...computeSnapshots(scans,prior)];
    for(let start=0;start<snapshots.length;start+=20){
      const batch=snapshots.slice(start,start+20).map(s=>{
        const platform=scans.find(row=>row.platform===s.platform)?.platform;
        if(!platform)throw new Error('invalid_snapshot_platform');
        return {...s,platform,provider_model:s.provider_model??null,measurement_region:s.measurement_region??null,measurement_mode:s.measurement_mode??null,
          scorer_version:s.scorer_version??null,measurement_contract_version:s.measurement_contract_version??null,search_mode:s.search_mode??null,
          analyzer_method:s.analyzer_method??null,analyzer_model:s.analyzer_model??null,analyzer_prompt_version:s.analyzer_prompt_version??null};
      });
      await ctx.runMutation(internal.drift.save,{jobId:args.jobId,snapshots:batch});
    }
    for(const alert of detectDrift(snapshots,prior,context.name)){
      const key=`sentiment-drift:${createHash('sha256').update(JSON.stringify([context.asOf,alert.cohort_key])).digest('hex')}`;
      const subject=`${context.name}: sampled sentiment ${alert.direction==='up'?'rose':'fell'} on ${alert.platform}`;
      await ctx.runMutation(internal.measurementAlerts.insert,{workspaceId:context.workspaceId,type:'sentiment_drift',title:subject,
        message:`Observed average changed from ${alert.prior.toFixed(2)} to ${alert.current.toFixed(2)} (n=${alert.prior_sample_size}/${alert.sample_size}). Matched settings and a bounded repeat-sample uncertainty check were required.`,dedupeKey:key,metadata:alert});
      messages.push({key,subject,html:await render(SentimentDriftEmail({alert}))});
    }
  }
  if(!messages.length)return null;
  do{
    const page:FunctionReturnType<typeof internal.weekly.recipients>=await ctx.runQuery(internal.weekly.recipients,{...args,paginationOpts:{cursor,numItems:50}});
    for(const recipientId of page.page)for(const message of messages)await ctx.runMutation(internal.mail.enqueue,{workspaceId:context.workspaceId,recipientId,
      kind:context.kind,dedupeKey:message.key,subject:message.subject,html:message.html});
    cursor=page.isDone?null:page.continueCursor;
  }while(cursor);
  return null;
}});
