import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('API schedules resolve configured entitled engines instead of saving an empty list', async () => {
const backend = await source('convex/apiWrites.ts');
 assert.match(backend,/configuredEngines/); assert.match(backend,/const platforms = args\.platforms \?\? entitled/);
 assert.match(backend,/if \(!platforms\.length\) throw new Error\('no_engines_available'\)/);
 assert.match(backend,/api_scope_denied/);
});

test('scheduled scan claims are leased atomically and service-role only', async () => {
  const sql = await source('supabase/migrations/028_claim_scheduled_scans.sql');
  const normalized = sql.replace(/\s+/g, ' ');
  assert.match(normalized, /FOR UPDATE SKIP LOCKED/i);
  assert.match(normalized, /claim_expires_at/i);
  assert.match(normalized, /REVOKE ALL ON FUNCTION public\.claim_due_scheduled_scans/i);
  assert.match(normalized, /GRANT EXECUTE ON FUNCTION public\.claim_due_scheduled_scans/i);
  assert.match(normalized, /TO service_role/i);
});

test('scan cron fails closed and consumes only atomically claimed schedules', async () => {
const [route, dispatcher, crons] = await Promise.all([source('app/api/cron/process-scans/route.ts'),source('convex/scheduled.ts'),source('convex/crons.ts')]);
 assert.match(route,/cron_not_configured/); assert.match(route,/timingSafeEqual/); assert.match(route,/status: 401/);
 assert.match(route,/internal\.scheduled\.dispatch/);
 assert.match(dispatcher,/export const runOne = internalMutation/);
 assert.match(dispatcher,/schedule\.nextRunAt !== args\.dueAt/);
 assert.match(dispatcher,/beginMeasurement/); assert.match(dispatcher,/samples: 4/);
 assert.match(dispatcher,/scanQuotaReservations/);
 assert.match(dispatcher,/run\.result\.status/);
 assert.match(crons,/internal\.scheduled\.dispatch/);
});

test('cookie schedule mutations require an editor role and validate entitled engines', async () => {
const backend = await source('convex/schedules.ts');
 assert.match(backend,/requireRole\(ctx\.tenant, 'editor'\)/);
 assert.match(backend,/requireWorkspace\(ctx, ctx\.tenant, args\.workspaceId\)/);
 assert.match(backend,/existing\.workspaceId !== workspace\._id/);
 assert.match(backend,/prompt\.length > 2000/);
 assert.match(backend,/engine_not_entitled/);
 assert.match(backend,/ctx\.tenant\.organization\.plan === 'free'/);
});
