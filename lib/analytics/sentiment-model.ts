export const DRIFT_THRESHOLD = 0.3;
export const MIN_SAMPLE_SIZE = 4;
export const driftFields = ['provider_model','measurement_region','measurement_mode','scorer_version','measurement_contract_version','search_mode','analyzer_method','analyzer_model','analyzer_prompt_version'] as const;
export type DriftSnapshot = { workspace_id: string; prompt: string; platform: string; week_start: string; avg_sentiment: number; sample_size: number } &
  Partial<Record<typeof driftFields[number], string | null>>;
export type DriftAlert = { cohort_key?: string; workspace_id: string; workspace_name: string; prompt: string; platform: string; current: number; prior: number; delta: number;
  direction: 'up'|'down'; sample_size: number; prior_sample_size: number; week_start: string };
export function weekStart(d: Date) {
  const w=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())); const day=w.getUTCDay();
  w.setUTCDate(w.getUTCDate()+(day===0?-6:1-day));return w;
}
export function isoDate(d: Date) {return d.toISOString().slice(0,10);}
export function driftCohort(row: Pick<DriftSnapshot,'prompt'|'platform'> & Partial<DriftSnapshot>): string | null {
  if(driftFields.some(field=>!row[field])) return null;
  return JSON.stringify([row.prompt,row.platform,...driftFields.map(field=>row[field])]);
}
export type SentimentSample = Omit<DriftSnapshot,'week_start'|'avg_sentiment'|'sample_size'> & { created_at:string; sentiment_score:number|null; failed?:boolean; hasResponse?:boolean };
export function computeSnapshots(scans: SentimentSample[], targetWeekStart: Date): DriftSnapshot[] {
  const start=weekStart(targetWeekStart).getTime(), end=start+7*86400000;
  const groups=new Map<string,{ row:SentimentSample; sum:number; count:number }>();
  for(const row of scans) {
    const date=Date.parse(row.created_at), key=driftCohort(row), score=row.sentiment_score;
    if(!key || row.failed || row.hasResponse===false || !Number.isFinite(date) || date<start || date>=end || score===null || !Number.isFinite(score) || score < -1 || score > 1) continue;
    const full=JSON.stringify([row.workspace_id,key]), group=groups.get(full)??{row,sum:0,count:0};
    group.sum+=score;group.count++;groups.set(full,group);
  }
  return [...groups.values()].map(({row,sum,count})=>({workspace_id:row.workspace_id,prompt:row.prompt,platform:row.platform,
    ...Object.fromEntries(driftFields.map(field=>[field,row[field]])),week_start:isoDate(new Date(start)),avg_sentiment:sum/count,sample_size:count}));
}
export function compareDrift(current: DriftSnapshot, prior: DriftSnapshot) {
  const key=driftCohort(current);
  if(!key || key!==driftCohort(prior) || current.workspace_id!==prior.workspace_id || Date.parse(current.week_start)-Date.parse(prior.week_start)!==7*86400000 ||
    [current,prior].some(row=>!Number.isSafeInteger(row.sample_size) || row.sample_size<MIN_SAMPLE_SIZE || !Number.isFinite(row.avg_sentiment) || Math.abs(row.avg_sentiment)>1)) return null;
  const delta=current.avg_sentiment-prior.avg_sentiment;
  // Two-sided Hoeffding bound for independent observations bounded in [-1,1].
  // This describes repeat-sample uncertainty, not the whole consumer AI audience.
  const radius=Math.sqrt(2*Math.log(40)*(1/current.sample_size+1/prior.sample_size));
  return {current:current.avg_sentiment,prior:prior.avg_sentiment,delta,
    qualified:Math.abs(delta)>=DRIFT_THRESHOLD && Math.abs(delta)>radius,
    interval:{lower:Math.max(-2,delta-radius),upper:Math.min(2,delta+radius),confidence:0.95 as const,method:'hoeffding' as const}};
}
export function detectDrift(snapshots: DriftSnapshot[], currentWeekStart: Date, workspaceName: string): DriftAlert[] {
  const current=isoDate(weekStart(currentWeekStart));const prior=isoDate(new Date(Date.parse(current)-7*86400000));
  const previous=new Map(snapshots.filter(row=>row.week_start===prior).map(row=>[JSON.stringify([row.workspace_id,driftCohort(row)]),row]));
  return snapshots.filter(row=>row.week_start===current).flatMap(row=>{
    const p=previous.get(JSON.stringify([row.workspace_id,driftCohort(row)]));const comparison=p?compareDrift(row,p):null;
    if(!comparison?.qualified || !p) return [];
    return [{cohort_key:driftCohort(row)!,workspace_id:row.workspace_id,workspace_name:workspaceName,prompt:row.prompt,platform:row.platform,current:comparison.current,prior:comparison.prior,
      delta:comparison.delta,direction:comparison.delta>0?'up' as const:'down' as const,sample_size:row.sample_size,prior_sample_size:p.sample_size,week_start:current}];
  });
}
