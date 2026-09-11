import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { getFunctionName, type FunctionArgs, type FunctionReference, type FunctionReturnType } from 'convex/server';
import { convexToJson, jsonToConvex, type JSONValue } from 'convex/values';
import { internal } from '../../convex/_generated/api';
import { canonicalJson } from '../../convex/lib/importParity';
import { EXPORT_TABLES, type ExportTable } from './migration-transform';

type TableManifest = { count: number; sha256: string; missing: boolean };
type Manifest = { version: string; sourceFingerprint: string; tables: Record<ExportTable, TableManifest> };
type Row = Record<string, unknown> & { publicId: string };
type InternalFunction = FunctionReference<'query' | 'mutation', 'internal'>;
export type ImportCaller = <F extends InternalFunction>(kind: 'query' | 'mutation', fn: F, args: FunctionArgs<F>) => Promise<FunctionReturnType<F>>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function readManifest(directory: string): Promise<{ manifest: Manifest; manifestHash: string }> {
  const path = resolve(directory, 'manifest.json');
  if ((await stat(path)).size > 100_000) throw new Error('manifest_too_large');
  const bytes = await readFile(path);
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  if (!record(parsed) || parsed.version !== 'aelo-convex-export.v1' ||
      typeof parsed.sourceFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.sourceFingerprint) || !record(parsed.tables)) {
    throw new Error('invalid_export_manifest');
  }
  if (Object.keys(parsed.tables).length !== EXPORT_TABLES.length) throw new Error('incomplete_export_manifest');
  for (const name of EXPORT_TABLES) {
    const table = parsed.tables[name];
    if (!record(table) || typeof table.count !== 'number' || !Number.isSafeInteger(table.count) || table.count < 0 ||
        typeof table.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(table.sha256) || typeof table.missing !== 'boolean' ||
        (table.missing && table.count !== 0)) throw new Error(`invalid_table_manifest:${name}`);
    if (table.missing && ['organizations', 'users', 'workspaces', 'products', 'llm_scans'].includes(name)) {
      throw new Error(`missing_required_export_table:${name}`);
    }
  }
  // Shape checked above. The table loop verifies every member of the finite key set.
  return { manifest: parsed as Manifest, manifestHash: createHash('sha256').update(bytes).digest('hex') };
}

export async function* exportRows(directory: string, table: ExportTable): AsyncGenerator<Row> {
  const lines = createInterface({ input: createReadStream(resolve(directory, `${table}.jsonl`)), crlfDelay: Infinity });
  let previous: string | null = null;
  try {
    for await (const line of lines) {
      if (Buffer.byteLength(line) > 500_000) throw new Error(`export_row_too_large:${table}`);
      const row: unknown = JSON.parse(line);
      if (!record(row) || typeof row.publicId !== 'string' || !row.publicId || (previous !== null && row.publicId <= previous)) {
        throw new Error(`invalid_export_order_or_id:${table}`);
      }
      previous = row.publicId;
      yield row as Row;
    }
  } finally { lines.close(); }
}

export async function verifyExport(directory: string, manifest: Manifest): Promise<void> {
  for (const table of EXPORT_TABLES) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(resolve(directory, `${table}.jsonl`))) hash.update(chunk);
    if (hash.digest('hex') !== manifest.tables[table].sha256) throw new Error(`export_hash_mismatch:${table}`);
    let count = 0;
    for await (const row of exportRows(directory, table)) {
      if (row.publicId) count++;
    }
    if (count !== manifest.tables[table].count) throw new Error(`export_count_mismatch:${table}`);
  }
}

export function assertImportTargetAllowed(target: string, confirmedTarget?: string): URL {
  const url = new URL(target);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (!local && url.protocol !== 'https:') || (local && !['http:', 'https:'].includes(url.protocol))) {
    throw new Error('invalid_convex_import_url');
  }
  if (!local && !url.hostname.endsWith('.convex.cloud')) {
    throw new Error('convex_import_requires_cloud_url');
  }
  if (!local && confirmedTarget !== url.origin) throw new Error('remote_import_requires_exact_target_confirmation');
  return url;
}

export function createImportCaller(url: URL, adminKey: string): ImportCaller {
  return async (kind, fn, args) => {
    const response = await fetch(`${url.origin}/api/${kind}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Convex ${adminKey}` },
      body: JSON.stringify({ path: getFunctionName(fn), args: [convexToJson(args)], format: 'convex_encoded_json' }),
    });
    // Convex errors can echo validated arguments. Never print raw server responses.
    if (!response.ok) throw new Error(`convex_import_request_failed:${getFunctionName(fn)}:${response.status}`);
    const result: unknown = await response.json();
    if (!record(result) || result.status !== 'success' || !('value' in result)) {
      throw new Error(`convex_import_function_failed:${getFunctionName(fn)}`);
    }
    // Convex functions validate their returns on the server; decode the wire value.
    return jsonToConvex(result.value as JSONValue) as FunctionReturnType<typeof fn>;
  };
}

export async function checkParity(manifestHash: string, manifest: Manifest, call: ImportCaller) {
  const counts: Record<string, number> = {};
  for (const table of EXPORT_TABLES) {
    let afterPublicId: string | null = null;
    let count = 0;
    while (true) {
      const page: FunctionReturnType<typeof internal.importControl.parityPage> = await call('query', internal.importControl.parityPage, { manifestHash, sourceTable: table, afterPublicId });
      if (page.missing || page.mismatched || canonicalJson(page.expected) !== canonicalJson(page.actual)) {
        throw new Error(`import_parity_failed:${table}`);
      }
      count += page.actual.count ?? 0;
      if (page.complete) break;
      if (!page.nextPublicId || page.nextPublicId === afterPublicId) throw new Error('import_cursor_did_not_advance');
      afterPublicId = page.nextPublicId;
    }
    let destinationCount = 0;
    afterPublicId = null;
    while (true) {
      const page: { count: number; nextPublicId: string | null; complete: boolean } = await call('query', internal.importControl.destinationCountPage, { sourceTable: table, afterPublicId });
      destinationCount += page.count;
      if (page.complete) break;
      if (!page.nextPublicId || page.nextPublicId === afterPublicId) throw new Error('import_cursor_did_not_advance');
      afterPublicId = page.nextPublicId;
    }
    if (count !== manifest.tables[table].count || destinationCount !== count) throw new Error(`import_count_mismatch:${table}`);
    counts[table] = count;
  }
  return counts;
}

export async function importExport(directory: string, call: ImportCaller): Promise<Record<string, number>> {
  const { manifest, manifestHash } = await readManifest(directory);
  await verifyExport(directory, manifest);
  const expectedCounts = Object.fromEntries(EXPORT_TABLES.map((table) => [table, manifest.tables[table].count]));
  const run = await call('mutation', internal.importControl.begin, {
    manifestHash, sourceLabel: manifest.sourceFingerprint, expectedCounts,
  });
  if (!run.complete) {
    for (const table of EXPORT_TABLES) {
      let batch: Array<{ publicId: string; payload: Row }> = [];
      let bytes = 0;
      const flush = async () => {
        if (batch.length) await call('mutation', internal.importControl.stage, { manifestHash, sourceTable: table, rows: batch });
        batch = []; bytes = 0;
      };
      for await (const row of exportRows(directory, table)) {
        const size = Buffer.byteLength(JSON.stringify(row));
        if (batch.length >= 100 || bytes + size > 750_000) await flush();
        batch.push({ publicId: row.publicId, payload: row }); bytes += size;
      }
      await flush();
    }
    // Nothing is materialized until all files have passed their hashes again.
    await verifyExport(directory, manifest);
    for (const table of EXPORT_TABLES) {
      let afterPublicId: string | null = null;
      while (true) {
        let page: { complete: boolean; nextPublicId: string | null };
        const args = { manifestHash, afterPublicId };
        if (table === 'organizations' || table === 'users' || table === 'workspaces') {
          page = await call('mutation', internal.imports.materializeTenantBatch, { ...args, sourceTable: table });
        } else if (table === 'products' || table === 'llm_scans' || table === 'api_keys' || table === 'billing_webhook_events' || table === 'public_scans') {
          page = await call('mutation', internal.imports.materializeCriticalBatch, { ...args, sourceTable: table });
        } else page = await call('mutation', internal.imports.materializeRemainingBatch, { ...args, sourceTable: table });
        if (page.complete) break;
        if (!page.nextPublicId || page.nextPublicId === afterPublicId) throw new Error('import_cursor_did_not_advance');
        afterPublicId = page.nextPublicId;
      }
    }
  }
  const counts = await checkParity(manifestHash, manifest, call);
  await call('mutation', internal.importControl.complete, { manifestHash, verifiedCounts: counts });
  return counts;
}

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

export function reportImportError(error: unknown): void {
  const message = error instanceof Error ? error.message : '';
  const safeCode = /^(?:export_|import_|convex_import_|invalid_|incomplete_|remote_|missing_required_)[A-Za-z0-9_.:-]+$/.test(message)
    ? message : 'import_failed';
  process.stderr.write(`Convex migration stopped: ${safeCode}. No completion claimed.\n`);
  process.exitCode = 1;
}

export async function main(parityOnly = false) {
  const input = option('--input');
  if (!input) throw new Error('import_input_required');
  const directory = resolve(input);
  const { manifest, manifestHash } = await readManifest(directory);
  await verifyExport(directory, manifest);
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`Export verified: ${EXPORT_TABLES.length} tables, ${Object.values(manifest.tables).reduce((sum, table) => sum + table.count, 0)} records. No database contacted.\n`);
    return;
  }
  const target = process.env.CONVEX_IMPORT_URL;
  const key = process.env.CONVEX_IMPORT_ADMIN_KEY ?? process.env.CONVEX_DEPLOY_KEY;
  if (!target || !key) throw new Error('convex_import_target_and_admin_key_required');
  const url = assertImportTargetAllowed(target, option('--confirm-target'));
  const call = createImportCaller(url, key);
  const counts = parityOnly ? await checkParity(manifestHash, manifest, call) : await importExport(directory, call);
  process.stdout.write(`${JSON.stringify({ status: 'verified', counts }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(reportImportError);
}
