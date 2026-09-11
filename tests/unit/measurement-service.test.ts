import assert from 'node:assert/strict';
import test from 'node:test';
import { runVisibilityMeasurement } from '../../lib/measurement/service';
import type { ScanOutput, ScanResult } from '../../lib/ai/llm-scanner';

function result(platform: ScanResult['platform'], mentioned: boolean, sampleId: string): ScanResult {
  return {
    platform, prompt: 'best tools', response: mentioned ? 'Aelo is listed.' : 'Other tools.',
    brandMentioned: mentioned, brandVariants: mentioned ? ['Aelo'] : [], mentionPosition: mentioned ? 1 : null,
    sentiment: mentioned ? 'positive' : null, sentimentScore: mentioned ? 0.8 : 0,
    sentimentReason: 'fixture', competitorsMentioned: [], competitorPositions: [], citations: [],
    sampleId, listItems: [], confidence: 0.9, timestamp: '2026-08-29T00:00:00.000Z',
  };
}

test('canonical run records complete engine and sample receipts', async () => {
  let call = 0;
  const run = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: ['gemini'], samples: 4,
  }, {
    execute: async (): Promise<ScanOutput> => ({ results: [result('gemini', ++call <= 3, `s${call}`)], errors: [] }),
  });
  assert.equal(run.contractVersion, 'measurement.v2');
  assert.equal(run.scorerVersion, 'aelo-brand-scorer.v2');
  assert.equal(run.region, 'global-unspecified');
  assert.equal(run.status, 'complete');
  assert.equal(run.engines[0].successfulSamples, 4);
  assert.equal(run.engines[0].mentionRate, 0.75);
  assert.equal(run.visibilityScore, 75);
  assert.equal(run.engines[0].confidence.level, 'low');
  assert.equal(run.samples.length, 4);
  assert.equal(run.samples[0].scorerVersion, 'aelo-brand-scorer.v2');
  assert.equal(run.samples[0].mode, 'standard');
});

test('canonical run distinguishes partial, all-failed, and untracked states', async () => {
  const partial = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: ['gemini', 'claude'], samples: 1,
  }, {
    execute: async () => ({ results: [result('gemini', true, 's1')], errors: [{ platform: 'claude', error: 'offline' }] }),
  });
  assert.equal(partial.status, 'partial');
  assert.equal(partial.failures.length, 1);
  assert.equal(partial.engines.find((engine) => engine.engine === 'claude')?.successfulSamples, 0);

  const allFailed = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: ['claude'], samples: 1,
  }, { execute: async () => ({ results: [], errors: [{ platform: 'claude', error: 'offline' }] }) });
  assert.equal(allFailed.status, 'all_failed');
  assert.equal(allFailed.visibilityScore, null);

  const untracked = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: [], samples: 1,
  }, { execute: async () => ({ results: [], errors: [] }) });
  assert.equal(untracked.status, 'untracked');
});

test('canonical visibility pools successful samples across engines', async () => {
  let call = 0;
  const run = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: ['gemini', 'claude'], samples: 2,
  }, {
    execute: async () => {
      call += 1;
      return {
        results: [
          result('gemini', true, `g${call}`),
          result('claude', call === 1, `c${call}`),
        ],
        errors: [],
      };
    },
  });

  assert.equal(run.visibilityScore, 75);
});

test('persistence failure makes an otherwise successful run partial', async () => {
  const run = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: ['gemini'], samples: 1,
  }, {
    execute: async () => ({ results: [result('gemini', true, 's1')], errors: [] }),
    persist: async () => { throw new Error('database offline'); },
  });
  assert.equal(run.status, 'partial');
  assert.equal(run.persistence.status, 'failed');
});

test('a timed-out executor becomes recorded sample failures instead of hanging the run', async () => {
  const run = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: ['gemini'], samples: 1,
  }, {
    execute: async () => new Promise<ScanOutput>(() => undefined),
    executeTimeoutMs: 10,
  });

  assert.equal(run.status, 'all_failed');
  assert.equal(run.visibilityScore, null);
  assert.equal(run.failures.length, 1);
  assert.match(run.failures[0].error, /timed out/i);
});

test('successful sample batches persist incrementally', async () => {
  let call = 0;
  const persistedBatchSizes: number[] = [];
  const run = await runVisibilityMeasurement({
    prompt: 'best tools', brandName: 'Aelo', platforms: ['gemini'], samples: 2,
  }, {
    execute: async () => ({ results: [result('gemini', true, `s${++call}`)], errors: [] }),
    persist: async (results) => { persistedBatchSizes.push(results.length); },
  });

  assert.deepEqual(persistedBatchSizes, [1, 1]);
  assert.equal(run.persistence.status, 'stored');
  assert.equal(run.persistence.rows, 2);
});
