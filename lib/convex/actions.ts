import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import type { FunctionReturnType } from 'convex/server';
export async function readActions(workspaceId: string) {
  const rows: FunctionReturnType<typeof api.actions.list>['page'] = [];
  let cursor: string | null = null;
  do {
    const result: FunctionReturnType<typeof api.actions.list> = await fetchAuthQuery(api.actions.list, { workspaceId, paginationOpts: { cursor, numItems: 100 } });
    rows.push(...result.page); cursor = result.isDone ? null : result.continueCursor;
  } while (cursor);
  return rows;
}
export async function readActionEvents(workspaceId: string) {
  const rows: FunctionReturnType<typeof api.actions.events>['page'] = [];
  let cursor: string | null = null;
  do {
    const result: FunctionReturnType<typeof api.actions.events> = await fetchAuthQuery(api.actions.events, { workspaceId, paginationOpts: { cursor, numItems: 100 } });
    rows.push(...result.page); cursor = result.isDone ? null : result.continueCursor;
  } while (cursor);
  return rows;
}
export async function readMembers() {
  const rows: FunctionReturnType<typeof api.settings.members>['page'] = [];
  let cursor: string | null = null;
  do {
    const result: FunctionReturnType<typeof api.settings.members> = await fetchAuthQuery(api.settings.members, { paginationOpts: { cursor, numItems: 100 } });
    rows.push(...result.page); cursor = result.isDone ? null : result.continueCursor;
  } while (cursor);
  return rows;
}
