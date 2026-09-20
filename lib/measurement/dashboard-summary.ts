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
  decisionBrief: DashboardDecisionBrief;
};

export type DashboardDecisionBrief = {
  status: 'actionable' | 'inconclusive' | 'unmeasured';
  competitor: string | null;
  competitorMentions: number;
  missedAnswerCount: number;
  prompt: string | null;
  headline: string;
  evidence: string;
  limitation: string;
  action: {
    title: string;
    description: string;
    href: string;
  };
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

function competitorDecision(input: {
  current: ReadonlyArray<DashboardObservation>;
  incomplete: boolean;
}): DashboardDecisionBrief {
  const usable = input.current.filter((row) => row.hasEvidence);
  const missed = usable.filter((row) => !row.brandMentioned);
  const retryAction = {
    title: 'Collect another matched sample set',
    description: 'Re-run the same buyer prompts with matching engines and settings before assigning competitor work.',
    href: '/dashboard/llm-tracker',
  };

  if (!usable.length) return {
    status: 'unmeasured', competitor: null, competitorMentions: 0, missedAnswerCount: 0, prompt: null,
    headline: 'No decision yet.',
    evidence: 'Aelo has no usable answers in the current seven-day window.',
    limitation: 'A competitor lead cannot be measured without successful samples.',
    action: retryAction,
  };

  if (input.incomplete || usable.length < 4 || missed.length < 2) return {
    status: 'inconclusive', competitor: null, competitorMentions: 0, missedAnswerCount: missed.length, prompt: null,
    headline: 'No defensible competitor lead yet.',
    evidence: `${usable.length} usable answer${usable.length === 1 ? '' : 's'}; your brand was absent from ${missed.length}.`,
    limitation: input.incomplete
      ? 'Some competitor or run evidence is incomplete, so Aelo will not name a leader.'
      : 'At least four usable answers and two omissions are required before Aelo names a leader.',
    action: retryAction,
  };

  const competitors = new Map<string, { name: string; count: number; prompts: Map<string, number> }>();
  for (const row of missed) {
    const seen = new Set<string>();
    for (const rawName of row.competitorsMentioned ?? []) {
      const name = rawName.trim();
      const key = name.toLocaleLowerCase('en-US');
      if (!name || seen.has(key)) continue;
      seen.add(key);
      const entry = competitors.get(key) ?? { name, count: 0, prompts: new Map<string, number>() };
      entry.count += 1;
      entry.prompts.set(row.prompt, (entry.prompts.get(row.prompt) ?? 0) + 1);
      competitors.set(key, entry);
    }
  }
  const ranked = [...competitors.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const leader = ranked[0];
  const tied = Boolean(leader && ranked[1]?.count === leader.count);
  if (!leader || leader.count < 2 || tied) return {
    status: 'inconclusive', competitor: null, competitorMentions: leader?.count ?? 0, missedAnswerCount: missed.length, prompt: null,
    headline: tied ? 'The observed competitor lead is tied.' : 'No competitor repeated enough to lead.',
    evidence: leader
      ? `${leader.name} appeared in ${leader.count} of ${missed.length} answers that omitted your brand.`
      : `${missed.length} usable answers omitted your brand without naming a tracked competitor.`,
    limitation: 'Aelo does not turn a tie or a one-off mention into a winner claim.',
    action: retryAction,
  };

  const prompt = [...leader.prompts.entries()]
    .sort(([aPrompt, aCount], [bPrompt, bCount]) => bCount - aCount || aPrompt.localeCompare(bPrompt))[0]![0];
  return {
    status: 'actionable', competitor: leader.name, competitorMentions: leader.count, missedAnswerCount: missed.length, prompt,
    headline: `${leader.name} led the answers that left you out.`,
    evidence: `${leader.name} appeared in ${leader.count} of ${missed.length} usable answers that omitted your brand, most often for “${prompt}”.`,
    limitation: 'This is an observed association in this sample, not proof that any page or source caused the result.',
    action: {
      title: `Create one source-gap action for “${prompt}”`,
      description: `Compare the provider-cited pages that mention ${leader.name}, close one evidence gap, then re-run the same prompt under matching settings.`,
      href: `/dashboard/interventions?prompt=${encodeURIComponent(prompt)}&competitor=${encodeURIComponent(leader.name)}`,
    },
  };
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
  const decisionBrief = competitorDecision({
    current,
    incomplete: input.truncated || Boolean(input.partialEvidence) || competitorEvidenceIncomplete,
  });

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
    decisionBrief,
  };
}
