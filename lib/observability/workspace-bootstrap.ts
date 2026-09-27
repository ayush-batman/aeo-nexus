export type WorkspaceBootstrapTimings = {
  tokenMs: number | null;
  backendMs: number | null;
  provisioned: boolean;
};

function milliseconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function workspaceBootstrapTelemetry(
  status: number,
  totalMs: number,
  timings: WorkspaceBootstrapTimings,
) {
  const durationMs = milliseconds(totalMs);
  const tokenMs = timings.tokenMs === null ? null : milliseconds(timings.tokenMs);
  const backendMs = timings.backendMs === null ? null : milliseconds(timings.backendMs);
  return {
    event: 'workspace_bootstrap',
    status,
    duration_ms: durationMs,
    token_ms: tokenMs,
    backend_ms: backendMs,
    provisioned: timings.provisioned,
    serverTiming: [
      `total;dur=${durationMs}`,
      ...(tokenMs === null ? [] : [`session;dur=${tokenMs}`]),
      ...(backendMs === null ? [] : [`workspace;dur=${backendMs}`]),
    ].join(', '),
  };
}
