'use node';

import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { engineValidator } from './validators';
import { scanLLM, type ScanOutput } from '../lib/ai/llm-scanner';
import { runVisibilityMeasurement } from '../lib/measurement/service';

export const sample = internalAction({
  args: { runId: v.id('measurementRuns'), engine: engineValidator, sampleNumber: v.number() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!await ctx.runMutation(internal.measurements.claimSample, args)) return null;
    const { publicId, input } = await ctx.runQuery(internal.measurements.executionInput, { runId: args.runId });
    const output = await scanLLM({ ...input, platforms: [args.engine] });
    const result = output.results[0] ?? null;
    if (result) {
      result.measurementRunId = publicId;
      result.sampleNumber = args.sampleNumber;
      // Reject an oversized response visibly rather than truncating evidence.
      if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 200_000) {
        await ctx.runMutation(internal.measurements.finishSample, { ...args, result: null, error: 'provider_evidence_too_large' });
        return null;
      }
    }
    await ctx.runMutation(internal.measurements.finishSample, { ...args, result,
      error: result ? null : output.errors[0]?.error ?? 'provider_empty_response' });
    return null;
  },
});

export const finalize = internalAction({
  args: { runId: v.id('measurementRuns') }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const run = await ctx.runQuery(internal.measurements.executionInput, args);
    if (run.finished) return null;
    let sampleNumber = 0;
    const result = await runVisibilityMeasurement(run.input, {
      runId: run.publicId, startedAt: run.startedAt,
      execute: async (): Promise<ScanOutput> => {
        const rows = await ctx.runQuery(internal.measurements.sampleResults, { runId: args.runId, sampleNumber: ++sampleNumber });
        return { results: rows.flatMap((row) => row.result ? [row.result] : []),
          errors: rows.flatMap((row) => row.error ? [{ platform: row.engine, error: row.error }] : []) };
      },
      // Each success was atomically stored with its sample; this hook marks the
      // existing rows, it does not write a second copy.
      persist: async () => {},
    });
    const json = JSON.stringify(result);
    if (Buffer.byteLength(json) > 600000) {
      // Full evidence belongs in file storage when the combined receipt is too
      // large for a document. Never truncate citations or mark them absent.
      const resultStorageId = await ctx.storage.store(new Blob([json], { type: 'application/json' }));
      const summary = { ...result, samples: [], engines: result.engines.map(engine => ({ ...engine, citations: [], evidence: [] })) };
      await ctx.runMutation(internal.measurements.finishRun, { runId: args.runId, result: summary, resultStorageId });
    } else await ctx.runMutation(internal.measurements.finishRun, { runId: args.runId, result });
    return null;
  },
});
