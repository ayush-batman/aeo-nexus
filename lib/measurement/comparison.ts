import { estimateMentionConfidence } from './confidence';

export type ComparableSnapshotPoint = {
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  sample_count?: number;
  mention_count?: number;
  mention_rate?: number | null;
  position_sample_count?: number;
  measured_at?: string;
  contract_version?: string;
  provider_model?: string;
  measurement_region?: string;
  measurement_mode?: string;
  scorer_version?: string;
  search_mode?: string;
  analyzer_method?: string;
  analyzer_model?: string;
  analyzer_prompt_version?: string;
};

export type ComparableSnapshot = Record<string, Record<string, ComparableSnapshotPoint>>;

export type InterventionVerdict = 'improved' | 'regressed' | 'inconclusive';

export type InterventionImpactSummary = {
  visibility_change: number | null;
  position_change: number | null;
  verdict: InterventionVerdict;
  reason: string;
  comparable_pairs: number;
  baseline_sample_count: number;
  followup_sample_count: number;
  baseline_confidence: ReturnType<typeof estimateMentionConfidence>;
  followup_confidence: ReturnType<typeof estimateMentionConfidence>;
  measured_at: string;
};

const MIN_SAMPLES_PER_COHORT = 4;

function compatibleMetadata(baseline: ComparableSnapshotPoint, followup: ComparableSnapshotPoint): boolean {
  const keys = ['contract_version', 'provider_model', 'measurement_region', 'measurement_mode', 'scorer_version',
    'search_mode', 'analyzer_method', 'analyzer_model', 'analyzer_prompt_version'] as const;
  return keys.every(key => Boolean(baseline[key]) && baseline[key] === followup[key]);
}

function validCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function compareVisibilitySnapshots(
  baseline: ComparableSnapshot,
  followup: ComparableSnapshot,
  measuredAt = new Date().toISOString(),
): InterventionImpactSummary {
  let baselineSamples = 0;
  let baselineMentions = 0;
  let followupSamples = 0;
  let followupMentions = 0;
  let baselinePositionSum = 0;
  let baselinePositionSamples = 0;
  let followupPositionSum = 0;
  let followupPositionSamples = 0;
  let comparablePairs = 0;
  const weights: Array<[number, number]> = [];

  for (const [prompt, followupEngines] of Object.entries(followup)) {
    const baselineEngines = baseline[prompt];
    if (!baselineEngines) continue;

    for (const [engine, followupPoint] of Object.entries(followupEngines)) {
      const baselinePoint = baselineEngines[engine];
      if (!baselinePoint) continue;
      if (!compatibleMetadata(baselinePoint, followupPoint)) continue;

      const baselineCount = baselinePoint.sample_count;
      const baselineMentionCount = baselinePoint.mention_count;
      const followupCount = followupPoint.sample_count;
      const followupMentionCount = followupPoint.mention_count;
      if (
        !validCount(baselineCount) || !validCount(baselineMentionCount) || baselineMentionCount > baselineCount ||
        !validCount(followupCount) || !validCount(followupMentionCount) || followupMentionCount > followupCount ||
        baselineCount < MIN_SAMPLES_PER_COHORT || followupCount < MIN_SAMPLES_PER_COHORT
      ) continue;

      comparablePairs++;
      weights.push([baselineCount, followupCount]);
      baselineSamples += baselineCount;
      baselineMentions += baselineMentionCount;
      followupSamples += followupCount;
      followupMentions += followupMentionCount;

      const baselinePositionCount = validCount(baselinePoint.position_sample_count)
        ? baselinePoint.position_sample_count
        : 0;
      const followupPositionCount = validCount(followupPoint.position_sample_count)
        ? followupPoint.position_sample_count
        : 0;
      if (baselinePoint.position !== null && Number.isFinite(baselinePoint.position) && baselinePoint.position >= 1 && baselinePositionCount > 0 && baselinePositionCount <= baselineMentionCount) {
        baselinePositionSum += baselinePoint.position * baselinePositionCount;
        baselinePositionSamples += baselinePositionCount;
      }
      if (followupPoint.position !== null && Number.isFinite(followupPoint.position) && followupPoint.position >= 1 && followupPositionCount > 0 && followupPositionCount <= followupMentionCount) {
        followupPositionSum += followupPoint.position * followupPositionCount;
        followupPositionSamples += followupPositionCount;
      }
    }
  }

  const baselineConfidence = estimateMentionConfidence(baselineMentions, baselineSamples);
  const followupConfidence = estimateMentionConfidence(followupMentions, followupSamples);
  const baselineRate = baselineConfidence.mentionRate;
  const followupRate = followupConfidence.mentionRate;
  const changedMix = weights.some(([before, after]) => before * followupSamples !== after * baselineSamples);
  const visibilityChange = changedMix || baselineRate === null || followupRate === null ? null : Math.round((followupRate - baselineRate) * 100);
  const positionChange = !changedMix && baselinePositionSamples > 0 && followupPositionSamples > 0
    ? Math.round(((followupPositionSum / followupPositionSamples) - (baselinePositionSum / baselinePositionSamples)) * 10) / 10
    : null;

  let verdict: InterventionVerdict = 'inconclusive';
  let reason = comparablePairs === 0
    ? 'No matching prompt, engine, model, region, mode, and scorer cohorts have at least 4 successful samples before and after the action.'
    : 'The 95% repeatability intervals overlap, so the observed change is inconclusive. Repeated AI answers are not independent samples of all users.';

  if (changedMix) reason = 'The relative sample counts changed across prompt/engine cohorts. Repeat the same sampling mix before comparing the pooled rates.';
  if (!changedMix && baselineConfidence.interval && followupConfidence.interval) {
    if (followupConfidence.interval.lower > baselineConfidence.interval.upper) {
      verdict = 'improved';
      reason = 'The follow-up mention rate is higher with non-overlapping 95% repeatability intervals. This is observed answer behavior, not proof that the action caused the change.';
    } else if (followupConfidence.interval.upper < baselineConfidence.interval.lower) {
      verdict = 'regressed';
      reason = 'The follow-up mention rate is lower with non-overlapping 95% repeatability intervals. This is observed answer behavior, not proof that the action caused the change.';
    }
  }

  return {
    visibility_change: visibilityChange,
    position_change: positionChange,
    verdict,
    reason,
    comparable_pairs: comparablePairs,
    baseline_sample_count: baselineSamples,
    followup_sample_count: followupSamples,
    baseline_confidence: baselineConfidence,
    followup_confidence: followupConfidence,
    measured_at: measuredAt,
  };
}
