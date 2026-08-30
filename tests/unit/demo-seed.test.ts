import assert from 'node:assert/strict';
import test from 'node:test';
import { demoScanRows, demoVisibilityMetrics } from '../../lib/analytics/demo-seed';

test('demo visibility sample counts are backed by the same number of receipts', () => {
  const rows = demoScanRows();
  const metrics = demoVisibilityMetrics();

  assert.equal(rows.length, metrics.reduce((total, metric) => total + metric.scanCount, 0));
  for (const metric of metrics) {
    const platformRows = rows.filter((row) => row.platform === metric.platform.toLowerCase());
    assert.equal(platformRows.length, metric.scanCount, `${metric.platform} receipt count`);
    assert.equal(platformRows.filter((row) => row.brand_mentioned).length, metric.mentionCount, `${metric.platform} mention count`);
    assert.ok(platformRows.every((row) => row.provider_model && row.measurement_run_id && row.sample_index));
  }
});
