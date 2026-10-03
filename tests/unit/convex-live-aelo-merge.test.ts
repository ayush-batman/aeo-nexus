import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import { LIVE_MERGE_TABLES, parsePreparedPackage, prepareLiveAeloMerge, verifyLiveAeloMerge } from '../../scripts/convex/merge-live-aelo';

type Row = Record<string, unknown> & { _id: string; _creationTime: number };
type Rows = Record<string, Row[]>;

function row(_id: string, fields: Record<string, unknown>): Row {
  return { _id, _creationTime: 1, ...fields };
}

function fixture(): { live: Rows; before: Rows } {
  const live: Rows = {
    organizations: [row('old-org', { publicId: 'old-org-public', plan: 'free', stripeCustomerId: null,
      stripeSubscriptionId: null, razorpaySubscriptionId: null })],
    users: [row('old-user', { publicId: 'old-user-public', normalizedEmail: 'owner@example.com', emailVerified: true })],
    memberships: [row('old-member', { userId: 'old-user', organizationId: 'old-org', role: 'owner' })],
    workspaces: [row('old-workspace', { publicId: 'old-workspace-public', organizationId: 'old-org' })],
    products: [row('old-product', { publicId: 'old-product-public', workspaceId: 'old-workspace' })],
    measurementRuns: [row('old-run', { publicId: 'old-run-public', organizationId: 'old-org', workspaceId: 'old-workspace', status: 'complete' })],
    scans: [row('old-scan', { publicId: 'old-scan-public', workspaceId: 'old-workspace', measurementRunId: 'old-run-public',
      response: 'unchanged raw answer', citations: [{ url: 'https://source.example', provenance: 'provider_citation' }] })],
    scanMetrics: [row('old-metric', { workspaceId: 'old-workspace', scanId: 'old-scan', measurementRunId: 'old-run-public', observation: { score: 0.75 } })],
    measurementSamples: [row('old-sample', { runId: 'old-run', result: { answer: 'unchanged raw answer' } })],
    measurementJobs: [row('old-job', { publicId: 'old-job-public', organizationId: 'old-org', workspaceId: 'old-workspace', status: 'skipped' })],
    scanQuotaReservations: [row('old-quota', { publicId: 'old-quota-public', organizationId: 'old-org', units: 4 })],
    weeklyJobs: [row('old-weekly', { workspaceId: 'old-workspace', status: 'complete' })],
  };
  const before: Rows = {
    organizations: [row('target-org', { publicId: 'legacy-org-public', plan: 'free' })],
    users: [row('target-user', { publicId: 'legacy-owner-public', legacySupabaseId: 'legacy-owner-public', normalizedEmail: 'owner@example.com' })],
    memberships: [row('target-member', { userId: 'target-user', organizationId: 'target-org', role: 'owner' })],
  };
  for (const table of Object.keys(live)) before[table] ??= [];
  return { live, before };
}

function prepare(live: Rows, before: Rows) {
  return prepareLiveAeloMerge(live, before, 'owner@example.com', 'legacy-owner-public', 'legacy-org-public');
}

test('merges historical Aelo evidence into the existing owner tenant without duplicating identity', () => {
  const { live, before } = fixture();
  const originalEvidence = JSON.stringify({ scan: live.scans[0], metric: live.scanMetrics[0], sample: live.measurementSamples[0] });
  const prepared = prepare(live, before);
  assert.equal(prepared.workspaces[0].organizationId, 'target-org');
  assert.equal(prepared.measurementRuns[0].organizationId, 'target-org');
  assert.equal(prepared.measurementJobs[0].organizationId, 'target-org');
  assert.equal(prepared.scanQuotaReservations[0].organizationId, 'target-org');
  assert.equal(prepared.scans[0]._id, 'old-scan');
  assert.equal(prepared.scans[0].measurementRunId, 'old-run-public');
  assert.equal(JSON.stringify({ scan: prepared.scans[0], metric: prepared.scanMetrics[0], sample: prepared.measurementSamples[0] }), originalEvidence);
  assert.equal(before.users.length, 1);
  assert.equal(before.memberships.length, 1);

  const after = Object.fromEntries(Object.entries(before).map(([table, rows]) => [table, [...rows, ...(prepared[table as keyof typeof prepared] ?? [])]]));
  assert.doesNotThrow(() => verifyLiveAeloMerge(prepared, before, after));
  after.scans[0] = { ...after.scans[0], citations: [] };
  assert.throws(() => verifyLiveAeloMerge(prepared, before, after), /merge_evidence_mismatch:scans/);
});

test('rejects unsafe identity, billing, active work, broken references, and replay collisions', () => {
  const cases: Array<[string, (live: Rows, before: Rows) => void, RegExp]> = [
    ['duplicate owner', (_live, before) => { before.users.push({ ...before.users[0], _id: 'other-user' }); }, /destination_owner_mismatch/],
    ['wrong email', (live) => { live.users[0].normalizedEmail = 'other@example.com'; }, /live_owner_graph_mismatch/],
    ['paid source', (live) => { live.organizations[0].stripeCustomerId = 'cus_synthetic'; }, /live_billing_requires_manual_reconciliation/],
    ['queued job', (live) => { live.measurementJobs[0].status = 'queued'; }, /live_work_is_not_terminal/],
    ['stored result', (live) => { live.measurementRuns[0].resultStorageId = 'file-synthetic'; }, /live_file_storage_requires_manual_migration/],
    ['broken sample', (live) => { live.measurementSamples[0].runId = 'missing'; }, /live_reference_missing:measurementSamples.runId/],
    ['broken public run ID', (live) => { live.scans[0].measurementRunId = 'missing'; }, /live_reference_missing:scans.measurementRunId/],
    ['replay', (_live, before) => { before.scans.push(row('old-scan', { publicId: 'old-scan-public' })); }, /destination_collision:scans/],
  ];
  for (const [label, mutate, message] of cases) {
    const { live, before } = fixture();
    mutate(live, before);
    assert.throws(() => prepare(live, before), message, label);
  }
});

test('prepared package rejects a changed baseline, changed evidence, or changed row count', () => {
  const { live, before } = fixture();
  const prepared = prepare(live, before);
  const contents = Object.fromEntries(LIVE_MERGE_TABLES.map((table) => [table,
    prepared[table].map((entry) => JSON.stringify(entry)).join('\n') + '\n']));
  const manifest = { destinationBeforeSha256: 'baseline-hash', tables: Object.fromEntries(
    LIVE_MERGE_TABLES.map((table) => [table, { count: prepared[table].length,
      sha256: createHash('sha256').update(contents[table]).digest('hex') }]),
  ) };
  assert.doesNotThrow(() => parsePreparedPackage(manifest, 'baseline-hash', contents));
  assert.throws(() => parsePreparedPackage(manifest, 'different-baseline', contents), /merge_package_manifest_mismatch/);
  assert.throws(() => parsePreparedPackage(manifest, 'baseline-hash', { ...contents, scans: contents.scans.replace('provider_citation', 'link_mentioned') }),
    /merge_package_hash_mismatch:scans/);
  const wrongCount = structuredClone(manifest);
  wrongCount.tables.scans.count++;
  assert.throws(() => parsePreparedPackage(wrongCount, 'baseline-hash', contents), /merge_package_count_mismatch:scans/);
});
