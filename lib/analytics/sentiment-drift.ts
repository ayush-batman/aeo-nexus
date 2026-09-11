import { api } from '../../convex/_generated/api';
import { fetchAuthQuery } from '../auth-server';
import type { FunctionReturnType } from 'convex/server';
import { weekStart,isoDate } from './sentiment-model';
export * from './sentiment-model';
export async function loadDriftHistory(workspaceId:string){
  const since=isoDate(weekStart(new Date(Date.now()-12*7*86400000)));
  const rows: FunctionReturnType<typeof api.drift.history>['page']=[];
  let cursor:string|null=null;
  do{
    const page: FunctionReturnType<typeof api.drift.history>=await fetchAuthQuery(api.drift.history,{workspaceId,since,paginationOpts:{numItems:100,cursor}});
    rows.push(...page.page);cursor=page.isDone?null:page.continueCursor;
  }while(cursor);
  return rows;
}
