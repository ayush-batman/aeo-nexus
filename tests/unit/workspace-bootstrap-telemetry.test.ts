import assert from 'node:assert/strict';
import test from 'node:test';

import { workspaceBootstrapTelemetry } from '../../lib/observability/workspace-bootstrap';

test('workspace bootstrap telemetry exposes only status and bounded phase durations', () => {
  const result = workspaceBootstrapTelemetry(200, 457.7, {
    tokenMs: 132.4,
    backendMs: 318.6,
    provisioned: false,
  });

  assert.deepEqual(result, {
    event: 'workspace_bootstrap',
    status: 200,
    duration_ms: 458,
    token_ms: 132,
    backend_ms: 319,
    provisioned: false,
    serverTiming: 'total;dur=458, session;dur=132, workspace;dur=319',
  });
  assert.deepEqual(Object.keys(result).sort(), [
    'backend_ms', 'duration_ms', 'event', 'provisioned', 'serverTiming', 'status', 'token_ms',
  ]);
});

test('failed authentication reports no backend phase and no non-finite durations', () => {
  const result = workspaceBootstrapTelemetry(401, Number.NaN, {
    tokenMs: -4,
    backendMs: null,
    provisioned: false,
  });

  assert.equal(result.duration_ms, 0);
  assert.equal(result.token_ms, 0);
  assert.equal(result.backend_ms, null);
  assert.equal(result.serverTiming, 'total;dur=0, session;dur=0');
});
