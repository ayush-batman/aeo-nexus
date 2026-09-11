import { estimateMentionConfidence } from './confidence';
import {
  aggregateMentionMetric,
  compareCompatibleMentionMetrics,
  healthScoreMetric,
  shareOfVoiceMetric,
  type ComparableMentionSample,
} from './metrics';
import type { MeasurementConfidenceLevel } from './types';

const DAY_MS = 86_400_000;
const DASHBOARD_ENGINES = ['chatgpt', 'gemini', 'claude', 'perplexity'] as const;

export type DashboardObservation = {
  prompt: string;
  platform: string;
  hasEvidence: boolean;
  brandMentioned: boolean;
  mentionPosition: number | null;
  competitorsMentioned?: ReadonlyArray<string>;
  providerModel: string | null;
  region: string | null;
  mode: string | null;
  scorerVersion: string | null;
  contractVersion: string | null;
  searchMode: string | null;
  analyzerMethod: string | null;
  analyzerModel: string | null;
  analyzerPromptVersion: string | null;
  createdAt: number;
};

export type DashboardVisibilityMetric = {
  platform: string;
  score: number | null;
  change: number | null;
  changeStatus: 'comparable' | 'incompatible' | 'insufficient_samples';
  scanCount: number;
  mentionCount: number;
  mentionRate: number | null;
  confidence: ReturnType<typeof estimateMentionConfidence>;
  averageMentionPosition: number | null;
  mentionPositionCount: number;
  mentionPositionTotal: number;
  comparisonCurrentSamples: number;
  comparisonCurrentMentions: number;
  comparisonPreviousSamples: number;
  comparisonPreviousMentions: number;
};

export type DashboardMeasurementStats = {
  aeoHealthScore: number | null;
  aeoScoreChange: number | null;
  llmVisibility: number | null;
  llmVisibilityChange: number | null;
  llmVisibilitySamples: number;
  llmVisibilityMentions: number;
  llmVisibilityConfidence: MeasurementConfidenceLevel;
  shareOfVoice: number | null;
  shareOfVoiceChange: number | null;
};

export type DashboardMeasurementSummary = {
  status: 'complete' | 'partial';
  partialReasons: string[];
  stats: DashboardMeasurementStats;
  visibilityMetrics: DashboardVisibilityMetric[];
};

function comparable(row: DashboardObservation): ComparableMentionSample {
  return {
    prompt: row.prompt,
    platform: row.platform,
    mentioned: row.brandMentioned,
    providerModel: row.providerModel,
    region: row.region,
    mode: row.mode,
    scorerVersion: row.scorerVersion,
    contractVersion: row.contractVersion,
    searchMode: row.searchMode,
    analyzerMethod: row.analyzerMethod,
    analyzerModel: row.analyzerModel,
    analyzerPromptVersion: row.analyzerPromptVersion,
  };
}

function platformLabel(platform: string): string {
  if (platform === 'chatgpt') return 'ChatGPT';
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function summarizeDashboardObservations(input: {
  observations: ReadonlyArray<DashboardObservation>;
  now?: number;
  truncated: boolean;
  partialEvidence?: boolean;
}): DashboardMeasurementSummary {
  const now = input.now ?? Date.now();
  const currentStart = now - 7 * DAY_MS;
  const previousStart = now - 14 * DAY_MS;
  const successful = input.observations.filter((row) => row.hasEvidence);
  const current = successful.filter((row) => row.createdAt >= currentStart && row.createdAt <= now);
  const previous = successful.filter((row) => row.createdAt >= previousStart && row.createdAt < currentStart);
  const currentMetric = aggregateMentionMetric(current.map((row) => ({ mentioned: row.brandMentioned })));
  const overallComparison = compareCompatibleMentionMetrics(current.map(comparable), previous.map(comparable));
  const partialReasons = input.truncated ? ['measurement_observations_truncated'] : [];
  if (input.partialEvidence) partialReasons.push('measurement_failures_or_pending_runs');
  const competitorEvidenceIncomplete = current.some((row) => row.competitorsMentioned === undefined);
  if (competitorEvidenceIncomplete) partialReasons.push('share_of_voice_evidence_incomplete');

  const mentionPositions = current
    .filter((row) => row.brandMentioned && row.mentionPosition !== null)
    .map((row) => row.mentionPosition as number);
  const positionTotal = mentionPositions.reduce((sum, value) => sum + value, 0);
  const averagePosition = mentionPositions.length ? positionTotal / mentionPositions.length : null;
  const visibilityMetrics = DASHBOARD_ENGINES.map((platform): DashboardVisibilityMetric => {
    const platformCurrent = current.filter((row) => row.platform === platform);
    const platformPrevious = previous.filter((row) => row.platform === platform);
    const metric = aggregateMentionMetric(platformCurrent.map((row) => ({ mentioned: row.brandMentioned })));
    const comparison = compareCompatibleMentionMetrics(platformCurrent.map(comparable), platformPrevious.map(comparable));
    const positions = platformCurrent
      .filter((row) => row.brandMentioned && row.mentionPosition !== null)
      .map((row) => row.mentionPosition as number);
    const platformPositionTotal = positions.reduce((sum, value) => sum + value, 0);
    return {
      platform: platformLabel(platform),
      score: input.truncated ? null : metric.visibilityPercent,
      change: input.truncated || input.partialEvidence ? null : comparison.changePoints,
      changeStatus: input.truncated || input.partialEvidence ? 'incompatible' : comparison.status,
      scanCount: metric.samples,
      mentionCount: metric.mentions,
      mentionRate: input.truncated ? null : metric.mentionRate,
      confidence: input.truncated ? estimateMentionConfidence(0, 0) : metric.confidence,
      averageMentionPosition: positions.length
        ? Math.round((platformPositionTotal / positions.length) * 10) / 10
        : null,
      mentionPositionCount: positions.length,
      mentionPositionTotal: platformPositionTotal,
      comparisonCurrentSamples: input.truncated ? 0 : comparison.current.samples,
      comparisonCurrentMentions: input.truncated ? 0 : comparison.current.mentions,
      comparisonPreviousSamples: input.truncated ? 0 : comparison.previous.samples,
      comparisonPreviousMentions: input.truncated ? 0 : comparison.previous.mentions,
    };
  });

  const shareOfVoice = input.truncated || competitorEvidenceIncomplete
    ? null
    : shareOfVoiceMetric(current.map((row) => ({
        brandMentioned: row.brandMentioned,
        competitorsMentioned: row.competitorsMentioned,
      }))).sharePercent;

  return {
    status: partialReasons.length ? 'partial' : 'complete',
    partialReasons,
    stats: {
      aeoHealthScore: input.truncated ? null : healthScoreMetric(currentMetric.visibilityPercent, averagePosition),
      aeoScoreChange: null,
      llmVisibility: input.truncated ? null : currentMetric.visibilityPercent,
      llmVisibilityChange: input.truncated || input.partialEvidence ? null : overallComparison.changePoints,
      llmVisibilitySamples: currentMetric.samples,
      llmVisibilityMentions: currentMetric.mentions,
      llmVisibilityConfidence: input.truncated ? 'none' : currentMetric.confidence.level,
      shareOfVoice,
      shareOfVoiceChange: null,
    },
    visibilityMetrics,
  };
}
