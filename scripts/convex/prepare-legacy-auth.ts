import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { exportRows, readManifest, verifyExport } from './import-convex';

type AppUser = {
  publicId: string;
  email: string;
  fullName: string | null;
  createdAt: number;
  updatedAt?: number | null;
};

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  deleted_at?: string | null;
  is_anonymous?: boolean;
};

export type BetterAuthSeedUser = {
  name: string;
  email: string;
  emailVerified: true;
  createdAt: number;
  updatedAt: number;
};

function email(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('invalid_legacy_email');
  return value.trim().toLowerCase();
}

export function prepareLegacyAuthUsers(
  appUsers: AppUser[],
  authUsers: SupabaseAuthUser[],
  now: number,
): { users: BetterAuthSeedUser[]; skippedUnverified: number; skippedAuthOnly: number } {
  if (!Number.isFinite(now)) throw new Error('invalid_prepare_time');
  const appByEmail = new Map<string, AppUser>();
  const authByEmail = new Map<string, SupabaseAuthUser>();
  const authIds = new Set<string>();
  for (const appUser of appUsers) {
    const normalized = email(appUser.email);
    if (appByEmail.has(normalized)) throw new Error('duplicate_app_email');
    if (!appUser.publicId || !Number.isFinite(appUser.createdAt) ||
        (appUser.updatedAt != null && !Number.isFinite(appUser.updatedAt))) {
      throw new Error('invalid_app_user');
    }
    appByEmail.set(normalized, appUser);
  }
  for (const authUser of authUsers) {
    if (!authUser.id || authIds.has(authUser.id)) throw new Error('duplicate_or_invalid_auth_id');
    authIds.add(authUser.id);
    if (!authUser.email) continue;
    const normalized = email(authUser.email);
    if (authByEmail.has(normalized)) throw new Error('duplicate_auth_email');
    authByEmail.set(normalized, authUser);
  }

  const users: BetterAuthSeedUser[] = [];
  let skippedUnverified = 0;
  let skippedAuthOnly = 0;
  for (const [normalized, authUser] of authByEmail) {
    const appUser = appByEmail.get(normalized);
    if (!appUser) {
      skippedAuthOnly++;
      continue;
    }
    if (appUser.publicId !== authUser.id) throw new Error('legacy_auth_id_mismatch');
    // Supabase's generic confirmed_at can also mean phone verification. Only
    // a verified email may claim an imported Aelo workspace by email.
    const verifiedAt = Date.parse(authUser.email_confirmed_at ?? '');
    const bannedUntil = authUser.banned_until ? Date.parse(authUser.banned_until) : null;
    if (!Number.isFinite(verifiedAt) || verifiedAt > now || authUser.deleted_at || authUser.is_anonymous ||
        (bannedUntil !== null && (!Number.isFinite(bannedUntil) || bannedUntil > now))) {
      skippedUnverified++;
      continue;
    }
    const preferredName = appUser.fullName?.trim();
    users.push({
      name: preferredName || normalized.split('@')[0],
      email: normalized,
      emailVerified: true,
      createdAt: appUser.createdAt,
      updatedAt: appUser.updatedAt ?? appUser.createdAt,
    });
  }
  // A missing Auth identity must not silently become a newly claimable user.
  for (const normalized of appByEmail.keys()) {
    if (!authByEmail.has(normalized)) throw new Error('app_user_without_auth_identity');
  }
  users.sort((a, b) => a.email.localeCompare(b.email));
  return { users, skippedUnverified, skippedAuthOnly };
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function fetchAuthUsers(baseUrl: string, serviceRoleKey: string): Promise<SupabaseAuthUser[]> {
  const users: SupabaseAuthUser[] = [];
  for (let page = 1; page <= 100; page++) {
    const url = new URL('/auth/v1/admin/users', baseUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '100');
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!response.ok) throw new Error(`auth_inventory_failed:${response.status}`);
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('users' in body) || !Array.isArray(body.users)) {
      throw new Error('invalid_auth_inventory');
    }
    const batch = body.users as SupabaseAuthUser[];
    users.push(...batch);
    if (batch.length < 100) return users;
  }
  throw new Error('auth_inventory_page_limit');
}

export async function prepareLegacyAuth(): Promise<void> {
  const input = option('--input');
  const output = option('--output');
  const sourceUrl = process.env.SUPABASE_EXPORT_URL;
  const serviceRoleKey = process.env.SUPABASE_EXPORT_SERVICE_ROLE_KEY;
  if (!input || !output || !sourceUrl || !serviceRoleKey) throw new Error('legacy_auth_input_not_configured');
  if (!process.argv.includes('--allow-production-auth-read')) throw new Error('production_auth_read_requires_acknowledgement');

  const inputDirectory = resolve(input);
  const outputDirectory = resolve(output);
  const { manifest, manifestHash } = await readManifest(inputDirectory);
  await verifyExport(inputDirectory, manifest);
  const source = new URL(sourceUrl);
  if (source.protocol !== 'https:' || source.pathname !== '/' || source.search || source.hash ||
      !source.hostname.endsWith('.supabase.co')) throw new Error('invalid_auth_source_url');
  const sourceFingerprint = createHash('sha256').update(`${source.hostname}/${source.pathname.replace(/^\//, '')}`).digest('hex');
  if (sourceFingerprint !== manifest.sourceFingerprint) throw new Error('auth_source_export_mismatch');
  const appUsers: AppUser[] = [];
  for await (const row of exportRows(inputDirectory, 'users')) {
    appUsers.push({
      publicId: row.publicId,
      email: row.email as string,
      fullName: row.fullName as string | null,
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number | null | undefined,
    });
  }
  const authUsers = await fetchAuthUsers(sourceUrl, serviceRoleKey);
  const prepared = prepareLegacyAuthUsers(appUsers, authUsers, Date.now());
  if (prepared.users.length === 0) throw new Error('no_verified_legacy_users');
  const jsonl = `${prepared.users.map((user) => JSON.stringify(user)).join('\n')}\n`;
  const authInventorySha256 = createHash('sha256').update(JSON.stringify(authUsers)).digest('hex');
  await mkdir(outputDirectory, { recursive: false, mode: 0o700 });
  await writeFile(resolve(outputDirectory, 'user.jsonl'), jsonl, { flag: 'wx', mode: 0o600 });
  await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify({
    version: 'aelo-legacy-auth-claim.v1',
    sourceExportManifestSha256: manifestHash,
    authInventorySha256,
    userJsonlSha256: createHash('sha256').update(jsonl).digest('hex'),
    counts: {
      appUsers: appUsers.length,
      authUsers: authUsers.length,
      prepared: prepared.users.length,
      skippedUnverified: prepared.skippedUnverified,
      skippedAuthOnly: prepared.skippedAuthOnly,
    },
  }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  process.stdout.write(`Legacy auth claim package prepared: ${prepared.users.length} verified app users; ` +
    `${prepared.skippedUnverified} unverified and ${prepared.skippedAuthOnly} auth-only identities excluded.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareLegacyAuth().catch((error: unknown) => {
    process.stderr.write(`Legacy auth preparation failed: ${error instanceof Error ? error.message : 'unknown_error'}\n`);
    process.exitCode = 1;
  });
}
