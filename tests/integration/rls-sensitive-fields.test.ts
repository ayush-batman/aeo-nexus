import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/025_lock_sensitive_identity_and_billing_fields.sql',
  import.meta.url,
);

async function migrationSql(): Promise<string> {
  return (await readFile(migrationUrl, 'utf8')).replace(/\s+/g, ' ').trim();
}

test('authenticated clients can update only allowlisted user profile columns', async () => {
  const sql = await migrationSql();

  assert.match(
    sql,
    /REVOKE UPDATE ON TABLE public\.users FROM anon, authenticated;/i,
  );
  assert.match(
    sql,
    /GRANT UPDATE \(full_name, avatar_url, onboarding_completed\) ON TABLE public\.users TO authenticated;/i,
  );
  assert.doesNotMatch(
    sql,
    /GRANT UPDATE \([^)]*(?:org_id|role|is_super_admin|email)[^)]*\) ON TABLE public\.users TO authenticated;/i,
  );
});

test('authenticated clients cannot write plan or payment identifiers', async () => {
  const sql = await migrationSql();

  assert.match(
    sql,
    /REVOKE UPDATE ON TABLE public\.organizations FROM anon, authenticated;/i,
  );
  assert.match(
    sql,
    /GRANT UPDATE \(name\) ON TABLE public\.organizations TO authenticated;/i,
  );
  assert.doesNotMatch(
    sql,
    /GRANT UPDATE \([^)]*(?:plan|stripe_customer_id|stripe_subscription_id|razorpay_subscription_id)[^)]*\) ON TABLE public\.organizations TO authenticated;/i,
  );
});

test('defense-in-depth triggers reject sensitive JWT-role updates', async () => {
  const sql = await migrationSql();

  assert.match(sql, /auth\.role\(\) IN \('anon', 'authenticated'\)/i);
  assert.match(sql, /NEW\.org_id IS DISTINCT FROM OLD\.org_id/i);
  assert.match(sql, /NEW\.role IS DISTINCT FROM OLD\.role/i);
  assert.match(sql, /NEW\.is_super_admin IS DISTINCT FROM OLD\.is_super_admin/i);
  assert.match(sql, /NEW\.plan IS DISTINCT FROM OLD\.plan/i);
  assert.match(sql, /BEFORE UPDATE ON public\.users/i);
  assert.match(sql, /BEFORE UPDATE ON public\.organizations/i);
});

test('row policies constrain both the old and new row', async () => {
  const sql = await migrationSql();

  assert.match(
    sql,
    /CREATE POLICY "Users can update own profile" ON public\.users FOR UPDATE TO authenticated USING \(id = auth\.uid\(\)\) WITH CHECK \(id = auth\.uid\(\)\);/i,
  );
  assert.match(
    sql,
    /CREATE POLICY "Owners can update org" ON public\.organizations FOR UPDATE TO authenticated USING[\s\S]*WITH CHECK/i,
  );
});
