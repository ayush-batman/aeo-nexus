import { estimateMentionConfidence } from './confidence';

export type MentionMetric = {
  status: 'measured' | 'unmeasured';
  samples: number;
  mentions: number;
  mentionRate: number | null;
  visibilityPercent: number | null;
  confidence: ReturnType<typeof estimateMentionConfidence>;
};

export type ComparableMentionSample = {
  prompt: string;
  platform: string;
  mentioned: boolean;
  providerModel?: string | null;
  region?: string | null;
  mode?: string | null;
  scorerVersion?: string | null;
  contractVersion?: string | null;
  searchMode?: string | null;
  analyzerMethod?: string | null;
  analyzerModel?: string | null;
  analyzerPromptVersion?: string | null;
};

export type MentionComparison = {
  status: 'comparable' | 'incompatible' | 'insufficient_samples';
  current: MentionMetric;
  previous: MentionMetric;
  changePoints: number | null;
};

export function mentionMetricFromCounts(mentions: number, samples: number): MentionMetric {
  const confidence = estimateMentionConfidence(mentions, samples);
  return {
    status: samples === 0 ? 'unmeasured' : 'measured',
    samples,
    mentions,
    mentionRate: confidence.mentionRate,
    visibilityPercent: confidence.mentionRate === null ? null : Math.round(confidence.mentionRate * 100),
    confidence,
  };
}

/** Visibility is the observed brand-mention rate across successful samples. */
export function aggregateMentionMetric(rows: ReadonlyArray<{ mentioned: boolean }>): MentionMetric {
  const mentions = rows.filter((row) => row.mentioned).length;
  return mentionMetricFromCounts(mentions, rows.length);
}

function compatibilityKey(sample: ComparableMentionSample): string | null {
  const values = [
    sample.prompt.trim(),
    sample.platform.trim().toLocaleLowerCase(),
    sample.providerModel?.trim(),
    sample.region?.trim(),
    sample.mode?.trim(),
    sample.scorerVersion?.trim(),
    sample.contractVersion?.trim(),
    sample.searchMode?.trim(),
    sample.analyzerMethod?.trim(),
    sample.analyzerModel?.trim(),
    sample.analyzerPromptVersion?.trim(),
  ];
  if (values.some((value) => !value)) return null;
  return values.join('\u0000');
}

function cohorts(samples: ReadonlyArray<ComparableMentionSample>): Map<string, ComparableMentionSample[]> {
  const grouped = new Map<string, ComparableMentionSample[]>();
  for (const sample of samples) {
    const key = compatibilityKey(sample);
    if (!key) continue;
    const cohort = grouped.get(key) ?? [];
    cohort.push(sample);
    grouped.set(key, cohort);
  }
  return grouped;
}

/**
 * Compare only prompt/engine/model/region/mode/scorer/contract matched cohorts.
 * Each retained cohort needs four successful samples in both periods.
 */
export function compareCompatibleMentionMetrics(
  currentRows: ReadonlyArray<ComparableMentionSample>,
  previousRows: ReadonlyArray<ComparableMentionSample>,
  minimumSamplesPerCohort = 4,
): MentionComparison {
  const empty = aggregateMentionMetric([]);
  const currentCohorts = cohorts(currentRows);
  const previousCohorts = cohorts(previousRows);
  const sharedKeys = [...currentCohorts.keys()].filter((key) => previousCohorts.has(key));
  if (sharedKeys.length === 0) {
    return { status: 'incompatible', current: empty, previous: empty, changePoints: null };
  }

  const eligibleKeys = sharedKeys.filter((key) =>
    (currentCohorts.get(key)?.length ?? 0) >= minimumSamplesPerCohort
    && (previousCohorts.get(key)?.length ?? 0) >= minimumSamplesPerCohort,
  );
  if (eligibleKeys.length === 0) {
    return { status: 'insufficient_samples', current: empty, previous: empty, changePoints: null };
  }

  const current = aggregateMentionMetric(eligibleKeys.flatMap((key) => currentCohorts.get(key) ?? []));
  const previous = aggregateMentionMetric(eligibleKeys.flatMap((key) => previousCohorts.get(key) ?? []));
  // A change in the prompt mix alone can move pooled visibility even when
  // every prompt's rate is unchanged (Simpson's paradox). Do not call that
  // improvement; require the same cohort proportions before pooling.
  if (eligibleKeys.some((key) => currentCohorts.get(key)!.length * previous.samples !==
      previousCohorts.get(key)!.length * current.samples)) {
    return { status: 'incompatible', current: empty, previous: empty, changePoints: null };
  }
  return {
    status: 'comparable',
    current,
    previous,
    changePoints: current.visibilityPercent! - previous.visibilityPercent!,
  };
}

export function shareOfVoiceMetric(rows: ReadonlyArray<{
  brandMentioned: boolean;
  competitorsMentioned: ReadonlyArray<string> | null | undefined;
}>): { brandMentions: number; competitorMentions: number; sharePercent: number | null } {
  const brandMentions = rows.filter((row) => row.brandMentioned).length;
  const competitorMentions = rows.reduce((total, row) => {
    const unique = new Set(
      (row.competitorsMentioned ?? [])
        .map((name) => name.trim().toLocaleLowerCase())
        .filter(Boolean),
    );
    return total + unique.size;
  }, 0);
  const totalMentions = brandMentions + competitorMentions;
  return {
    brandMentions,
    competitorMentions,
    sharePercent: totalMentions === 0 ? null : Math.round((brandMentions / totalMentions) * 100),
  };
}

/** A secondary composite; visibility itself remains the unweighted mention rate. */
export function healthScoreMetric(visibilityPercent: number | null, averageMentionPosition: number | null): number | null {
  if (visibilityPercent === null) return null;
  if (visibilityPercent === 0) return 0;
  if (averageMentionPosition === null || !Number.isFinite(averageMentionPosition)) return null;
  const boundedPosition = Math.min(10, Math.max(1, averageMentionPosition));
  const positionBoost = ((10 - boundedPosition) / 9) * 100;
  return Math.round((visibilityPercent * 0.7) + (positionBoost * 0.3));
}
