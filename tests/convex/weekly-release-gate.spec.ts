import { afterEach, expect, test, vi } from 'vitest';
import { internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';

afterEach(() => vi.unstubAllEnvs());

test('weekly jobs do not touch imported workspaces until explicitly enabled', async () => {
  const { t } = await fixture();
  vi.stubEnv('AELO_WEEKLY_JOBS_ENABLED', undefined);

  expect(await t.mutation(internal.weekly.dispatch, { kind: 'weekly_digest' })).toBe(0);
  expect(await t.run(ctx => ctx.db.query('weeklyJobs').take(1))).toEqual([]);

  vi.stubEnv('AELO_WEEKLY_JOBS_ENABLED', 'true');
  expect(await t.mutation(internal.weekly.dispatch, { kind: 'weekly_digest' })).toBe(2);
  expect(await t.run(ctx => ctx.db.query('weeklyJobs').take(3))).toHaveLength(2);
});
