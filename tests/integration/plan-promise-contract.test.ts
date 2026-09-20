import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('pricing, signup, receipt, dashboard and upgrade prompts use one plan catalogue', async () => {
  const paths = [
    'app/(marketing)/pricing/page.tsx',
    'app/(auth)/signup/page.tsx',
    'app/(marketing)/scan/[id]/page.tsx',
    'app/(dashboard)/dashboard/settings/page.tsx',
    'components/billing/upgrade-modal.tsx',
  ];
  const files = await Promise.all(paths.map(source));

  for (const file of files) assert.match(file, /billing\/plan-catalog/);
  assert.doesNotMatch(files.join('\n'), /₹14,999|₹4,999|₹50,000/);
  assert.match(files[0], /plan\.scanPromise/);
  assert.match(files[1], /selectedPlanDefinition!\.scanPromise/);
  assert.match(files[2], /radar\.scanPromise/);
  assert.match(files[3], /currentPlanDefinition\.scanPromise/);
});
