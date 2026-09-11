import { expect, test, vi } from 'vitest';
import { api, internal } from '../../convex/_generated/api';
import { createAnalyticsIngestToken } from '../../lib/analytics-ingest';
import { fixture } from './fixtures';
test('survey tokens bind the workspace, preserve independent responses and reject viewers', async () => {
  const { t, owner, context } = await fixture();
  vi.stubEnv('ANALYTICS_INGEST_SECRET','synthetic-local-signing-key-at-least-thirty-two');
  try {
    const payload={workspaceId:context.workspaceId,source:'chatgpt',ingestToken:'invalid'};
    await expect(t.action(internal.attributionActions.submitPublic,{body:JSON.stringify(payload),ip:'127.0.0.1'})).rejects.toThrow('invalid_ingest_token');
    payload.ingestToken=createAnalyticsIngestToken(context.workspaceId);
    await t.action(internal.attributionActions.submitPublic,{body:JSON.stringify(payload),ip:'127.0.0.1'});
    await t.action(internal.attributionActions.submitPublic,{body:JSON.stringify({...payload,source:'referral'}),ip:'127.0.0.2'});
    const result=await owner.query(api.attribution.responses,{workspaceId:context.workspaceId,paginationOpts:{numItems:100,cursor:null}});
    expect(result.page).toHaveLength(2);
    await t.run(async ctx=>{const membership=await ctx.db.query('memberships').first();await ctx.db.patch(membership!._id,{role:'viewer'});});
    await expect(owner.action(api.attributionActions.submit,{body:JSON.stringify(payload)})).rejects.toThrow('forbidden_role');
  } finally {vi.unstubAllEnvs();}
});
