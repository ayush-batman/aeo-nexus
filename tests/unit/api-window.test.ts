import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApiWindow } from '../../lib/api-window';

test('visibility trend never labels 90-day data with an unsupported window', () => {
  const choices = [['30d', 30], ['90d', 90], ['180d', 180]] as const;
  assert.deepEqual(resolveApiWindow('180d', choices, '90d'), { window: '180d', days: 180 });
  assert.deepEqual(resolveApiWindow('7d', choices, '90d'), { window: '90d', days: 90 });
  assert.deepEqual(resolveApiWindow(null, choices, '90d'), { window: '90d', days: 90 });
});

test('citation and competitor windows use the matching day count', () => {
  const choices = [['7d', 7], ['30d', 30], ['90d', 90]] as const;
  assert.deepEqual(resolveApiWindow('7d', choices, '30d'), { window: '7d', days: 7 });
  assert.deepEqual(resolveApiWindow('unexpected', choices, '30d'), { window: '30d', days: 30 });
  assert.deepEqual(resolveApiWindow('', choices, '30d'), { window: '30d', days: 30 });
});

test('a missing fallback is a configuration error, not a false report', () => {
  assert.throws(() => resolveApiWindow(null, [['7d', 7]], '30d'), /invalid_api_window_configuration/);
});
