import assert from 'node:assert/strict';
import test from 'node:test';
import { ConvexError } from 'convex/values';
import { resolveProvisionedWorkspace } from '../../lib/convex/workspace-resolution';

test('existing accounts need one read and no provisioning write', async () => {
  let reads = 0, writes = 0;
  const context = { workspaceId: 'synthetic-workspace' };
  assert.equal(await resolveProvisionedWorkspace(async () => { reads++; return context; }, async () => { writes++; }), context);
  assert.equal(reads, 1); assert.equal(writes, 0);
});

test('only an explicit missing profile provisions once and rechecks authorization', async () => {
  let reads = 0, writes = 0;
  assert.equal(await resolveProvisionedWorkspace(async () => {
    if (++reads === 1) throw new ConvexError('profile_not_provisioned');
    return 'authorized';
  }, async () => { writes++; }), 'authorized');
  assert.equal(reads, 2); assert.equal(writes, 1);
});

test('missing workspace, authorization failures and outages never create accounts', async () => {
  let writes = 0;
  assert.equal(await resolveProvisionedWorkspace(async () => null, async () => { writes++; }), null);
  for (const error of [new Error('profile_not_provisioned'), new Error('offline'), new ConvexError('membership_not_found'), new ConvexError('verified_email_required')]) {
    await assert.rejects(resolveProvisionedWorkspace(async () => { throw error; }, async () => { writes++; }), caught => caught === error);
  }
  assert.equal(writes, 0);
});

test('failed provisioning and failed post-provision authorization are not retried', async () => {
  let writes = 0;
  await assert.rejects(resolveProvisionedWorkspace(async () => { throw new ConvexError('profile_not_provisioned'); }, async () => { writes++; throw new Error('unavailable'); }), /unavailable/);
  assert.equal(writes, 1);
  let reads = 0;
  await assert.rejects(resolveProvisionedWorkspace(async () => { reads++; throw new ConvexError('profile_not_provisioned'); }, async () => { writes++; }), /profile_not_provisioned/);
  assert.equal(reads, 2); assert.equal(writes, 2);
});
