import type { LLMPlatform } from '@/lib/ai/llm-scanner';
import type { CitationEvidence } from '@/lib/types';

export const MEASUREMENT_CONTRACT_VERSION = 'measurement.v1' as const;
export const MEASUREMENT_SCORER_VERSION = 'aelo-brand-scorer.v1' as const;

export type MeasurementRunStatus = 'complete' | 'partial' | 'all_failed' | 'untracked';
export type MeasurementConfidenceLevel = 'none' | 'low' | 'medium' | 'high';

export type MeasurementConfidence = {
  level: MeasurementConfidenceLevel;
  sampleCount: number;
  mentions: number;
  mentionRate: number | null;
  interval: null | {
    lower: number;
    upper: number;
    confidence: 0.95;
    method: 'wilson';
  };
};

export type MeasurementSample = {
  sampleNumber: number;
  engine: LLMPlatform;
  providerModel: string | null;
  region: string;
  mode: 'standard' | 'battle';
  scorerVersion: typeof MEASUREMENT_SCORER_VERSION;
  status: 'succeeded' | 'failed';
  sampleId: string | null;
  mentioned: boolean | null;
  position: number | null;
  sentiment: string | null;
  responseSnippet: string | null;
  analyzerConfidence: number | null;
  citations: CitationEvidence[];
  error: string | null;
};

export type EngineMeasurement = {
  engine: LLMPlatform;
  providerModels: string[];
  requestedSamples: number;
  successfulSamples: number;
  failedSamples: number;
  mentions: number;
  mentionRate: number | null;
  mentioned: boolean | null;
  avgPosition: number | null;
  sentiment: string | null;
  confidence: MeasurementConfidence;
  citations: CitationEvidence[];
  evidence: MeasurementSample[];
};

export type MeasurementFailure = {
  sampleNumber: number;
  engine: LLMPlatform;
  error: string;
};

export type MeasurementPersistence = {
  status: 'stored' | 'failed' | 'not_applicable';
  rows: number;
  error: string | null;
};

export type VisibilityMeasurementRun = {
  contractVersion: typeof MEASUREMENT_CONTRACT_VERSION;
  runId: string;
  scorerVersion: typeof MEASUREMENT_SCORER_VERSION;
  region: string;
  mode: 'standard' | 'battle';
  prompt: string;
  brandName: string;
  requestedEngines: LLMPlatform[];
  requestedSamplesPerEngine: number;
  status: MeasurementRunStatus;
  visibilityScore: number | null;
  engines: EngineMeasurement[];
  samples: MeasurementSample[];
  failures: MeasurementFailure[];
  persistence: MeasurementPersistence;
  startedAt: string;
  completedAt: string;
};
