import { estimateMentionConfidence } from './measurement/confidence';

export type WeeklyScanRow = {
  prompt: string;
  platform: string;
  brand_mentioned: boolean;
  citations: Array<{ url?: string; provenance?: string }> | null;
  created_at: string;
  provider_model?: string | null;
  measurement_region?: string | null;
  measurement_mode?: string | null;
  scorer_version?: string | null;
  measurement_contract_version?: string | null;
  search_mode?: string | null;
  analyzer_method?: string | null;
  analyzer_model?: string | null;
  analyzer_prompt_version?: string | null;
};
export type WeeklyActionRow = {
  id: string;
  title: string;
  owner_id: string | null;
  target_prompts: string[] | null;
  status: string;
};
export type WeeklyDecisionItem = {
  id: string;
  prompt: string;
  engine: string;
  direction: 'improved' | 'regressed';
  changePoints: number;
  previous: ReturnType<typeof estimateMentionConfidence>;
  current: ReturnType<typeof estimateMentionConfidence>;
  sourceUrls: string[];
  whyItMatters: string;
  action: { id: string; title: string; ownerId: string | null } | null;
};
export type WeeklyDecisionInbox = {
  generatedAt: string;
  currentWindow: { from: string; to: string };
  previousWindow: { from: string; to: string };
  items: WeeklyDecisionItem[];
};

type Cohort = { samples: number; mentions: number; sources: Set<string> };

export function buildWeeklyDecisionInbox(rows: WeeklyScanRow[], actions: WeeklyActionRow[], now = new Date()): WeeklyDecisionInbox {
  const currentStart = new Date(now.getTime() - 7 * 86400000);
  const previousStart = new Date(now.getTime() - 14 * 86400000);
  const current = new Map<string, Cohort>();
  const previous = new Map<string, Cohort>();

  for (const row of rows) {
    const date = new Date(row.created_at);
    const target = date >= currentStart && date <= now ? current : date >= previousStart && date < currentStart ? previous : null;
    if (!target) continue;
    const compatibility = [
      row.provider_model,
      row.measurement_region,
      row.measurement_mode,
      row.scorer_version,
      row.measurement_contract_version,
      row.search_mode,
      row.analyzer_method,
      row.analyzer_model,
      row.analyzer_prompt_version,
    ];
    // Legacy or partially tagged rows remain visible elsewhere, but they cannot
    // support a defensible week-over-week claim.
    if (compatibility.some(value => !value)) continue;
    const key = [row.prompt, row.platform, ...compatibility].join('\u0000');
    const cohort = target.get(key) ?? { samples: 0, mentions: 0, sources: new Set<string>() };
    cohort.samples += 1;
    if (row.brand_mentioned) cohort.mentions += 1;
    for (const citation of row.citations ?? []) {
      if (citation.provenance === 'provider_citation' && citation.url) cohort.sources.add(citation.url);
    }
    target.set(key, cohort);
  }

  const items: WeeklyDecisionItem[] = [];
  for (const [key, currentCohort] of current) {
    const previousCohort = previous.get(key);
    if (!previousCohort || currentCohort.samples < 4 || previousCohort.samples < 4) continue;
    const currentConfidence = estimateMentionConfidence(currentCohort.mentions, currentCohort.samples);
    const previousConfidence = estimateMentionConfidence(previousCohort.mentions, previousCohort.samples);
    if (!currentConfidence.interval || !previousConfidence.interval) continue;
    const direction = currentConfidence.interval.lower > previousConfidence.interval.upper
      ? 'improved' as const
      : currentConfidence.interval.upper < previousConfidence.interval.lower
        ? 'regressed' as const
        : null;
    if (!direction) continue;

    const [prompt, engine] = key.split('\u0000');
    const action = actions.find(item => item.status !== 'measured' && (item.target_prompts ?? []).includes(prompt));
    const changePoints = Math.round(((currentConfidence.mentionRate ?? 0) - (previousConfidence.mentionRate ?? 0)) * 100);
    items.push({
      id: `${engine}:${prompt}`,
      prompt,
      engine,
      direction,
      changePoints,
      previous: previousConfidence,
      current: currentConfidence,
      sourceUrls: [...currentCohort.sources].slice(0, 3),
      whyItMatters: direction === 'regressed'
        ? 'A buyer question lost a defensible brand mention; review the answer sources and assigned response.'
        : 'A buyer question gained a defensible brand mention; preserve the evidence and verify the linked action.',
      action: action ? { id: action.id, title: action.title, ownerId: action.owner_id } : null,
    });
  }

  items.sort((a, b) => Math.abs(b.changePoints) - Math.abs(a.changePoints));
  return {
    generatedAt: now.toISOString(),
    currentWindow: { from: currentStart.toISOString(), to: now.toISOString() },
    previousWindow: { from: previousStart.toISOString(), to: currentStart.toISOString() },
    items,
  };
}
