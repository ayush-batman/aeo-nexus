import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';
test('a private workspace named after an index brand does not publish anything', async () => {
  const { t,owner,context }=await fixture();
  await owner.mutation(api.settings.saveWorkspace,{workspaceId:context.workspaceId,name:'Zoho'});
  expect((await t.query(api.indiaIndex.entries,{edition:'2026-09',paginationOpts:{numItems:100,cursor:null}})).page).toEqual([]);
  expect((await t.query(api.indiaIndex.receipts,{edition:'2026-09',brand:'Zoho',offset:0})).scans).toEqual([]);
  await expect(owner.mutation(api.indiaIndex.publish,{edition:'2026-09',workspaceId:context.workspaceId,brand:'Zoho',category:'SaaS',website:null,scanIds:[]})).rejects.toThrow('forbidden_role');
});
