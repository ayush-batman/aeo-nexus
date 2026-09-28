import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { canonicalJson } from '../../convex/lib/importParity';
import { readManifest, verifyExport } from './import-convex';

type Document = Record<string, unknown> & { _id: string; _creationTime: number };
type Snapshot = Record<string, Document[]>;

export const LIVE_MERGE_TABLES = [
  'workspaces', 'products', 'measurementRuns', 'scans', 'scanMetrics',
  'measurementSamples', 'measurementJobs', 'scanQuotaReservations', 'weeklyJobs',
] as const;

const LIVE_IDENTITY_TABLES = ['organizations', 'users', 'memberships'] as const;
const READ_TABLES = [...LIVE_IDENTITY_TABLES, ...LIVE_MERGE_TABLES] as const;

const RELATIONS: Partial<Record<(typeof LIVE_MERGE_TABLES)[number], Record<string, string>>> = {
  workspaces: { organizationId: 'organizations' },
  products: { workspaceId: 'workspaces' },
  measurementRuns: { organizationId: 'organizations', workspaceId: 'workspaces' },
  scans: { workspaceId: 'workspaces' },
  scanMetrics: { workspaceId: 'workspaces', scanId: 'scans' },
  measurementSamples: { runId: 'measurementRuns' },
  measurementJobs: { organizationId: 'organizations', workspaceId: 'workspaces' },
  scanQuotaReservations: { organizationId: 'organizations' },
  weeklyJobs: { workspaceId: 'workspaces' },
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function id(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`invalid_id:${label}`);
  return value;
}

function exactlyOne(snapshot: Snapshot, table: string): Document {
  const rows = snapshot[table] ?? [];
  if (rows.length !== 1) throw new Error(`unexpected_identity_count:${table}`);
  return rows[0];
}

function indexById(snapshot: Snapshot, table: string): Map<string, Document> {
  const result = new Map<string, Document>();
  for (const row of snapshot[table] ?? []) {
    if (result.has(row._id)) throw new Error(`duplicate_document_id:${table}`);
    result.set(row._id, row);
  }
  return result;
}

export function prepareLiveAeloMerge(
  live: Snapshot,
  destination: Snapshot,
  ownerEmail: string,
  legacyOwnerPublicId: string,
  legacyOrgPublicId: string,
): Record<(typeof LIVE_MERGE_TABLES)[number], Document[]> {
  const oldOrganization = exactlyOne(live, 'organizations');
  const oldUser = exactlyOne(live, 'users');
  const oldMembership = exactlyOne(live, 'memberships');
  const oldWorkspace = exactlyOne(live, 'workspaces');
  const email = ownerEmail.trim().toLowerCase();
  if (oldUser.normalizedEmail !== email || oldUser.emailVerified !== true ||
      oldMembership.userId !== oldUser._id || oldMembership.organizationId !== oldOrganization._id ||
      oldWorkspace.organizationId !== oldOrganization._id || oldMembership.role !== 'owner') {
    throw new Error('live_owner_graph_mismatch');
  }
  if (oldOrganization.plan !== 'free' || oldOrganization.stripeCustomerId !== null ||
      oldOrganization.stripeSubscriptionId !== null || oldOrganization.razorpaySubscriptionId !== null) {
    throw new Error('live_billing_requires_manual_reconciliation');
  }

  const importedUser = (destination.users ?? []).filter((row) => row.normalizedEmail === email);
  const importedOrganization = (destination.organizations ?? []).filter((row) => row.publicId === legacyOrgPublicId);
  if (importedUser.length !== 1 || importedUser[0].publicId !== legacyOwnerPublicId ||
      importedUser[0].legacySupabaseId !== legacyOwnerPublicId || importedOrganization.length !== 1 ||
      importedOrganization[0].plan !== 'free') {
    throw new Error('destination_owner_mismatch');
  }
  if (!(destination.memberships ?? []).some((row) =>
    row.userId === importedUser[0]._id && row.organizationId === importedOrganization[0]._id && row.role === 'owner')) {
    throw new Error('destination_membership_missing');
  }

  const oldIds = new Map<string, Map<string, Document>>();
  for (const table of READ_TABLES) oldIds.set(table, indexById(live, table));
  // These two fields are public run IDs, not Convex document IDs.
  const runPublicIds = new Set((live.measurementRuns ?? []).map((row) => id(row.publicId, 'measurementRuns.publicId')));
  for (const table of LIVE_MERGE_TABLES) {
    const targetIds = indexById(destination, table);
    const targetPublicIds = new Set((destination[table] ?? []).map((row) => row.publicId).filter((value) => typeof value === 'string'));
    for (const row of live[table] ?? []) {
      if (targetIds.has(row._id) || (typeof row.publicId === 'string' && targetPublicIds.has(row.publicId))) {
        throw new Error(`destination_collision:${table}`);
      }
      for (const [field, parent] of Object.entries(RELATIONS[table] ?? {})) {
        if (row[field] !== null && row[field] !== undefined && !oldIds.get(parent)?.has(id(row[field], `${table}.${field}`))) {
          throw new Error(`live_reference_missing:${table}.${field}`);
        }
      }
      if ((table === 'scans' || table === 'scanMetrics') && row.measurementRunId !== null &&
          row.measurementRunId !== undefined && !runPublicIds.has(id(row.measurementRunId, `${table}.measurementRunId`))) {
        throw new Error(`live_reference_missing:${table}.measurementRunId`);
      }
    }
  }
  if ((live.measurementRuns ?? []).some((row) => row.resultStorageId !== null && row.resultStorageId !== undefined)) {
    throw new Error('live_file_storage_requires_manual_migration');
  }
  if ((live.measurementRuns ?? []).some((row) => row.status !== 'complete') ||
      (live.measurementJobs ?? []).some((row) => !['complete', 'skipped', 'failed'].includes(String(row.status))) ||
      (live.weeklyJobs ?? []).some((row) => row.status !== 'complete')) {
    throw new Error('live_work_is_not_terminal');
  }

  const targetOrganizationId = importedOrganization[0]._id;
  const prepared = {} as Record<(typeof LIVE_MERGE_TABLES)[number], Document[]>;
  for (const table of LIVE_MERGE_TABLES) {
    prepared[table] = (live[table] ?? []).map((row) => {
      const copy = { ...row };
      if ('organizationId' in copy && copy.organizationId === oldOrganization._id) {
        copy.organizationId = targetOrganizationId;
      }
      return copy;
    });
  }
  return prepared;
}

function archiveEntries(path: string): Set<string> {
  const output = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8', maxBuffer: 10_000_000 });
  return new Set(output.split('\n').filter(Boolean));
}

export function readSnapshot(path: string, rejectUnknownData = false): Snapshot {
  const entries = archiveEntries(path);
  const snapshot: Snapshot = {};
  for (const table of READ_TABLES) {
    const entry = `${table}/documents.jsonl`;
    if (!entries.has(entry)) throw new Error(`snapshot_table_missing:${table}`);
    const content = execFileSync('unzip', ['-p', path, entry], { encoding: 'utf8', maxBuffer: 50_000_000 });
    snapshot[table] = content.split('\n').filter(Boolean).map((line) => {
      const parsed: unknown = JSON.parse(line);
      if (!object(parsed) || typeof parsed._id !== 'string' || !parsed._id ||
          typeof parsed._creationTime !== 'number' || !Number.isFinite(parsed._creationTime)) {
        throw new Error(`invalid_snapshot_document:${table}`);
      }
      return parsed as Document;
    });
  }
  if (rejectUnknownData) {
    const known = new Set<string>(READ_TABLES);
    for (const entry of entries) {
      const match = /^([^/_][^/]*)\/documents\.jsonl$/.exec(entry);
      if (!match || known.has(match[1])) continue;
      const content = execFileSync('unzip', ['-p', path, entry], { encoding: 'utf8', maxBuffer: 50_000_000 });
      if (content.trim()) throw new Error(`unmapped_live_table:${match[1]}`);
    }
    const checkedComponentPath = /^_components\/.*\/(?:pendingStart|pendingCompletion|pendingCancelation|work)\/documents\.jsonl$/;
    for (const entry of entries) {
      if (entry !== '_storage/documents.jsonl' && !checkedComponentPath.test(entry)) continue;
      const content = execFileSync('unzip', ['-p', path, entry], { encoding: 'utf8', maxBuffer: 50_000_000 });
      if (content.trim()) throw new Error('live_storage_or_component_work_pending');
    }
  }
  return snapshot;
}

export function verifyLiveAeloMerge(
  prepared: Record<(typeof LIVE_MERGE_TABLES)[number], Document[]>,
  before: Snapshot,
  after: Snapshot,
): void {
  for (const table of LIVE_IDENTITY_TABLES) {
    const original = indexById(before, table);
    const final = indexById(after, table);
    if (original.size !== final.size) throw new Error(`merge_identity_count_changed:${table}`);
    for (const [docId, row] of original) {
      const result = final.get(docId);
      if (!result || canonicalJson(row) !== canonicalJson(result)) throw new Error(`merge_identity_changed:${table}`);
    }
  }
  for (const table of LIVE_MERGE_TABLES) {
    const original = indexById(before, table);
    const expected = new Map(original);
    for (const row of prepared[table]) {
      if (expected.has(row._id)) throw new Error(`merge_duplicate_id:${table}`);
      expected.set(row._id, row);
    }
    const final = indexById(after, table);
    if (expected.size !== final.size) throw new Error(`merge_count_mismatch:${table}`);
    for (const [docId, row] of expected) {
      const result = final.get(docId);
      if (!result || canonicalJson(row) !== canonicalJson(result)) throw new Error(`merge_evidence_mismatch:${table}`);
    }
  }
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function parsePreparedPackage(
  manifestValue: unknown,
  destinationBeforeSha256: string,
  contents: Record<string, string>,
): Record<(typeof LIVE_MERGE_TABLES)[number], Document[]> {
  if (!object(manifestValue) || !object(manifestValue.tables) ||
      manifestValue.destinationBeforeSha256 !== destinationBeforeSha256) {
    throw new Error('merge_package_manifest_mismatch');
  }
  const prepared = {} as Record<(typeof LIVE_MERGE_TABLES)[number], Document[]>;
  for (const table of LIVE_MERGE_TABLES) {
    const content = contents[table];
    const tableManifest = manifestValue.tables[table];
    if (typeof content !== 'string' || !object(tableManifest) || tableManifest.sha256 !== sha256(content) ||
        typeof tableManifest.count !== 'number') throw new Error(`merge_package_hash_mismatch:${table}`);
    prepared[table] = content.split('\n').filter(Boolean).map((line) => {
      const parsed: unknown = JSON.parse(line);
      if (!object(parsed) || typeof parsed._id !== 'string' || !parsed._id ||
          typeof parsed._creationTime !== 'number' || !Number.isFinite(parsed._creationTime)) {
        throw new Error(`merge_package_document_invalid:${table}`);
      }
      return parsed as Document;
    });
    if (prepared[table].length !== tableManifest.count) throw new Error(`merge_package_count_mismatch:${table}`);
  }
  return prepared;
}

async function main() {
  const livePath = option('--live-backup');
  const beforePath = option('--destination-before');
  const exportPath = option('--legacy-export');
  const ownerEmail = option('--owner-email');
  const expectedHash = option('--expected-live-sha256');
  const outputPath = option('--output');
  const afterPath = option('--verify-after');
  if (afterPath) {
    if (!beforePath || !outputPath) throw new Error('merge_verify_arguments_required');
    const manifestValue: unknown = JSON.parse(await readFile(resolve(outputPath, 'manifest.json'), 'utf8'));
    const contents: Record<string, string> = {};
    for (const table of LIVE_MERGE_TABLES) {
      contents[table] = await readFile(resolve(outputPath, `${table}.jsonl`), 'utf8');
    }
    const prepared = parsePreparedPackage(manifestValue, sha256(await readFile(resolve(beforePath))), contents);
    verifyLiveAeloMerge(prepared, readSnapshot(resolve(beforePath)), readSnapshot(resolve(afterPath)));
    process.stdout.write('Live Aelo merge parity verified.\n');
    return;
  }
  if (!livePath || !beforePath || !exportPath || !ownerEmail || !expectedHash || !outputPath) {
    throw new Error('merge_arguments_required');
  }
  const { manifest } = await readManifest(resolve(exportPath));
  await verifyExport(resolve(exportPath), manifest);
  const liveBytes = await readFile(resolve(livePath));
  if (sha256(liveBytes) !== expectedHash) throw new Error('live_backup_hash_mismatch');
  const ownerRows = (await readFile(resolve(exportPath, 'users.jsonl'), 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line) as unknown);
  const owner = ownerRows.filter((row) => object(row) && row.email === ownerEmail);
  if (owner.length !== 1 || !object(owner[0])) throw new Error('legacy_owner_not_unique');
  const legacyOwnerPublicId = id(owner[0].publicId, 'legacy_owner');
  const legacyOrgPublicId = id(owner[0].organizationPublicId, 'legacy_organization');
  const live = readSnapshot(resolve(livePath), true);
  const destination = readSnapshot(resolve(beforePath));
  for (const [source, table] of [['organizations', 'organizations'], ['users', 'users'],
    ['workspaces', 'workspaces'], ['products', 'products'], ['llm_scans', 'scans']] as const) {
    if ((destination[table] ?? []).length !== manifest.tables[source].count) {
      throw new Error(`destination_baseline_count_mismatch:${table}`);
    }
  }
  const prepared = prepareLiveAeloMerge(live, destination, ownerEmail, legacyOwnerPublicId, legacyOrgPublicId);
  const outputDirectory = resolve(outputPath);
  await mkdir(outputDirectory, { recursive: false, mode: 0o700 });
  const tableHashes: Record<string, { count: number; sha256: string }> = {};
  for (const table of LIVE_MERGE_TABLES) {
    const content = prepared[table].map((row) => JSON.stringify(row)).join('\n') + (prepared[table].length ? '\n' : '');
    await writeFile(resolve(outputDirectory, `${table}.jsonl`), content, { mode: 0o600, flag: 'wx' });
    tableHashes[table] = { count: prepared[table].length, sha256: sha256(content) };
  }
  await writeFile(resolve(outputDirectory, 'manifest.json'), JSON.stringify({
    liveBackupSha256: expectedHash,
    destinationBeforeSha256: sha256(await readFile(resolve(beforePath))),
    ownerReconciled: true,
    excludedFromImport: ['organizations', 'users', 'memberships', 'component state'],
    tables: tableHashes,
  }, null, 2), { mode: 0o600, flag: 'wx' });
  process.stdout.write(`Prepared ${Object.values(tableHashes).reduce((count, table) => count + table.count, 0)} historical records across ${LIVE_MERGE_TABLES.length} tables. No database changed.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    const safe = /^[a-z_]+(?::[a-zA-Z0-9_.]+)?$/.test(message) ? message : 'merge_preparation_failed';
    process.stderr.write(`Live Aelo merge stopped: ${safe}.\n`);
    process.exitCode = 1;
  });
}
