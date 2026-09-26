import { randomUUID } from 'node:crypto';
import { scanLLM, type LLMPlatform, type ScanOptions, type ScanOutput, type ScanResult } from '../ai/llm-scanner';
import type { CitationEvidence } from '../types';
import { estimateMentionConfidence } from './confidence';
import { aggregateMentionMetric } from './metrics';
import {
  MEASUREMENT_CONTRACT_VERSION,
  MEASUREMENT_SCORER_VERSION,
  type EngineMeasurement,
  type MeasurementFailure,
  type MeasurementPersistence,
  type MeasurementSample,
  type VisibilityMeasurementRun,
} from './types';

export type VisibilityMeasurementInput = Omit<ScanOptions, 'platforms'> & {
  platforms: LLMPlatform[];
  samples: number;
};

type MeasurementDependencies = {
  runId?: string;
  startedAt?: string;
  execute?: (options: ScanOptions) => Promise<ScanOutput>;
  persist?: (results: ScanResult[]) => Promise<void>;
  executeTimeoutMs?: number;
};

const DEFAULT_EXECUTE_TIMEOUT_MS = 45_000;

async function withDeadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Measurement executor timed out after ${timeoutMs}ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ordered[0][1] > (ordered[1]?.[1] ?? 0) ? ordered[0][0] : null;
}

function dedupeCitations(citations: CitationEvidence[]): CitationEvidence[] {
  const byUrl = new Map<string, CitationEvidence>();
  for (const citation of citations) {
    if (!citation || typeof citation.url !== 'string') continue;
    const current = byUrl.get(citation.url);
    if (!current || (current.provenance !== 'provider_citation' && citation.provenance === 'provider_citation')) {
      byUrl.set(citation.url, citation);
    }
  }
  return [...byUrl.values()];
}

function engineMeasurement(engine: LLMPlatform, requestedSamples: number, samples: MeasurementSample[]): EngineMeasurement {
  const evidence = samples.filter((sample) => sample.engine === engine);
  const succeeded = evidence.filter((sample) => sample.status === 'succeeded');
  const mentions = succeeded.filter((sample) => sample.mentioned === true).length;
  const positions = succeeded.flatMap((sample) => sample.mentioned === true && typeof sample.position === 'number' && Number.isFinite(sample.position) && sample.position >= 1 ? [sample.position] : []);
  const sentiments = succeeded.flatMap((sample) => sample.sentiment ? [sample.sentiment] : []);
  const confidence = estimateMentionConfidence(mentions, succeeded.length);
  return {
    engine,
    providerModels: [...new Set(succeeded.flatMap((sample) => sample.providerModel ? [sample.providerModel] : []))],
    requestedSamples,
    successfulSamples: succeeded.length,
    failedSamples: evidence.length - succeeded.length,
    mentions,
    mentionRate: confidence.mentionRate,
    mentioned: confidence.mentionRate === null ? null : confidence.mentionRate >= 0.5,
    avgPosition: positions.length
      ? Math.round((positions.reduce((sum, value) => sum + value, 0) / positions.length) * 10) / 10
      : null,
    sentiment: mode(sentiments),
    confidence,
    citations: dedupeCitations(succeeded.flatMap((sample) => sample.citations)),
    evidence,
  };
}

function visibilityScore(engines: EngineMeasurement[]): number | null {
  const successfulSamples = engines.flatMap((engine) =>
    engine.evidence
      .filter((sample) => sample.status === 'succeeded')
      .map((sample) => ({ mentioned: sample.mentioned === true })),
  );
  return aggregateMentionMetric(successfulSamples).visibilityPercent;
}

export async function runVisibilityMeasurement(
  input: VisibilityMeasurementInput,
  dependencies: MeasurementDependencies = {},
): Promise<VisibilityMeasurementRun> {
  if (!Number.isSafeInteger(input.samples) || input.samples < 1 || input.samples > 8) {
    throw new RangeError('samples must be an integer from 1 to 8.');
  }
  const requestedEngines = [...new Set(input.platforms)];
  const execute = dependencies.execute ?? scanLLM;
  const runId = dependencies.runId ?? randomUUID();
  const region = process.env.AELO_MEASUREMENT_REGION?.trim() || 'global-unspecified';
  const mode = input.mode ?? 'standard';
  const startedAt = dependencies.startedAt ?? new Date().toISOString();
  const samples: MeasurementSample[] = [];
  const failures: MeasurementFailure[] = [];
  const successfulResults: ScanResult[] = [];
  let persistence: MeasurementPersistence = { status: 'not_applicable', rows: 0, error: null };

  for (let sampleNumber = 1; sampleNumber <= input.samples; sampleNumber++) {
    if (requestedEngines.length === 0) break;
    let output: ScanOutput;
    try {
      output = await withDeadline(
        execute({ ...input, platforms: requestedEngines }),
        dependencies.executeTimeoutMs ?? DEFAULT_EXECUTE_TIMEOUT_MS,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Measurement executor failed.';
      output = {
        results: [],
        errors: requestedEngines.map((engine) => ({ platform: engine, error: message })),
      };
    }
    const sampleResults: ScanResult[] = [];
    for (const engine of requestedEngines) {
      const result = output.results.find((candidate) => candidate.platform === engine);
      if (result) {
        result.measurementRunId = runId;
        result.sampleNumber = sampleNumber;
        result.measurementContractVersion = MEASUREMENT_CONTRACT_VERSION;
        result.scorerVersion = MEASUREMENT_SCORER_VERSION;
        result.measurementRegion = result.measurementRegion || region;
        result.measurementMode = result.measurementMode || mode;
        successfulResults.push(result);
        sampleResults.push(result);
        samples.push({
          sampleNumber,
          engine,
          providerModel: result.providerModel ?? null,
          searchMode: result.searchMode ?? null,
          analyzerMethod: result.analyzerMethod ?? null,
          analyzerModel: result.analyzerModel ?? null,
          analyzerPromptVersion: result.analyzerPromptVersion ?? null,
          recommendationStatus: result.recommendationStatus ?? 'unassessed',
          recommendationEvidence: result.recommendationEvidence ?? null,
          recommendationMethod: result.recommendationMethod ?? null,
          region: result.measurementRegion,
          mode: result.measurementMode,
          scorerVersion: MEASUREMENT_SCORER_VERSION,
          status: 'succeeded',
          sampleId: result.sampleId,
          mentioned: result.brandMentioned,
          position: result.mentionPosition,
          sentiment: result.sentiment,
          responseSnippet: (result.response || '').slice(0, 240),
          analyzerConfidence: result.confidence,
          citations: result.citations ?? [],
          error: null,
        });
        continue;
      }
      const reported = output.errors.find((candidate) => candidate.platform === engine);
      const error = reported?.error || 'Provider returned no result or failure detail.';
      failures.push({ sampleNumber, engine, error });
      samples.push({
        sampleNumber,
        engine,
        providerModel: null,
        region,
        mode,
        scorerVersion: MEASUREMENT_SCORER_VERSION,
        status: 'failed',
        recommendationStatus: 'unassessed',
        recommendationEvidence: null,
        recommendationMethod: null,
        sampleId: null,
        mentioned: null,
        position: null,
        sentiment: null,
        responseSnippet: null,
        analyzerConfidence: null,
        citations: [],
        error,
      });
    }

    if (sampleResults.length > 0 && dependencies.persist) {
      try {
        await dependencies.persist(sampleResults);
        persistence = {
          status: persistence.status === 'failed' ? 'failed' : 'stored',
          rows: persistence.rows + sampleResults.length,
          error: persistence.error,
        };
      } catch (error) {
        persistence = {
          status: 'failed',
          rows: persistence.rows,
          error: persistence.error ?? (error instanceof Error ? error.message : 'Unknown persistence error'),
        };
      }
    }
  }

  const engines = requestedEngines.map((engine) => engineMeasurement(engine, input.samples, samples));
  const status = requestedEngines.length === 0
    ? 'untracked'
    : successfulResults.length === 0
      ? 'all_failed'
      : failures.length > 0 || persistence.status === 'failed'
        ? 'partial'
        : 'complete';

  return {
    contractVersion: MEASUREMENT_CONTRACT_VERSION,
    runId,
    scorerVersion: MEASUREMENT_SCORER_VERSION,
    region,
    mode,
    prompt: input.prompt,
    brandName: input.brandName,
    requestedEngines,
    requestedSamplesPerEngine: input.samples,
    status,
    visibilityScore: visibilityScore(engines),
    engines,
    samples,
    failures,
    persistence,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
