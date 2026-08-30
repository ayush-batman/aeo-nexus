import { createHash } from 'node:crypto';
import { mkdir, open, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

import {
  assertExportTargetAllowed,
  EXPORT_TABLES,
  transformExportRow,
  type ExportTable,
} from './migration-transform';

const PAGE_SIZE = 1_000;
const EXPORT_VERSION = 'aelo-convex-export.v1';

type TableManifest = {
  count: number;
  sha256: string;
  missing: boolean;
};

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function sourceFingerprint(connectionString: string): string {
  const url = new URL(connectionString);
  return createHash('sha256')
    .update(`${url.hostname}/${url.pathname.replace(/^\//, '')}`)
    .digest('hex');
}

async function directoryHasManifest(outputDirectory: string): Promise<boolean> {
  try {
    await stat(resolve(outputDirectory, 'manifest.json'));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function exportTable(
  client: pg.PoolClient,
  table: ExportTable,
  outputDirectory: string,
): Promise<TableManifest> {
  const filePath = resolve(outputDirectory, `${table}.jsonl`);
  const file = await open(filePath, 'wx');
  const hash = createHash('sha256');
  let count = 0;
  let cursor: string | null = null;

  try {
    while (true) {
      const result: pg.QueryResult<Record<string, unknown>> = cursor
        ? await client.query(
            `SELECT * FROM public."${table}" WHERE id > $1 ORDER BY id LIMIT $2`,
            [cursor, PAGE_SIZE],
          )
        : await client.query(
            `SELECT * FROM public."${table}" ORDER BY id LIMIT $1`,
            [PAGE_SIZE],
          );

      for (const row of result.rows) {
        const line = `${JSON.stringify(transformExportRow(table, row))}\n`;
        await file.write(line);
        hash.update(line);
        count += 1;
      }

      if (result.rows.length < PAGE_SIZE) break;
      const nextCursor = result.rows.at(-1)?.id;
      if (typeof nextCursor !== 'string') throw new Error(`missing_export_cursor:${table}`);
      cursor = nextCursor;
    }
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') {
      return { count: 0, sha256: hash.digest('hex'), missing: true };
    }
    throw error;
  } finally {
    await file.close();
  }

  return { count, sha256: hash.digest('hex'), missing: false };
}

export async function exportSupabase(): Promise<void> {
  const connectionString = process.env.SUPABASE_EXPORT_DATABASE_URL;
  if (!connectionString) throw new Error('SUPABASE_EXPORT_DATABASE_URL_not_configured');

  const outputDirectory = resolve(
    argumentValue('--output') ?? 'tmp/convex-migration/export',
  );
  const allowProductionExport = process.argv.includes('--allow-production-export');
  assertExportTargetAllowed(connectionString, allowProductionExport);

  await mkdir(outputDirectory, { recursive: true });
  if (await directoryHasManifest(outputDirectory)) {
    throw new Error('export_manifest_already_exists');
  }

  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 60_000,
  });
  const client = await pool.connect();
  const tables: Partial<Record<ExportTable, TableManifest>> = {};

  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for (const table of EXPORT_TABLES) {
      tables[table] = await exportTable(client, table, outputDirectory);
      process.stdout.write(
        `${table}: ${tables[table]?.missing ? 'missing' : tables[table]?.count}\n`,
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  const manifest = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sourceFingerprint: sourceFingerprint(connectionString),
    tables,
  };
  await writeFile(
    resolve(outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: 'wx', mode: 0o600 },
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  exportSupabase().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'unknown_export_error';
    process.stderr.write(`Convex export failed: ${message}\n`);
    process.exitCode = 1;
  });
}
