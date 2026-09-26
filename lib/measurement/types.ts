import type { LLMPlatform } from '../ai/llm-scanner';
import type { CitationEvidence } from '../types';

export const MEASUREMENT_CONTRACT_VERSION = 'measurement.v2' as const;
export const MEASUREMENT_SCORER_VERSION = 'aelo-brand-scorer.v2' as const;

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
  scorerVersion: string;
  searchMode?: string | null;
  analyzerMethod?: string | null;
  analyzerModel?: string | null;
  analyzerPromptVersion?: string | null;
  recommendationStatus?: 'recommended' | 'not_recommended' | 'unassessed' | 'not_mentioned';
  recommendationEvidence?: string | null;
  recommendationMethod?: string | null;
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
  contractVersion: string;
  runId: string;
  scorerVersion: string;
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
