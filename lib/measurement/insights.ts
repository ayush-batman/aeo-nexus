import type { LLMScan } from '../types';
import { groupRecentScans } from './scan-groups';

export type InsightCategory = 'visibility' | 'narrative' | 'sentiment' | 'audit' | 'citation';
export type InsightPriority = 'high' | 'medium' | 'low';

export type Insight = {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  targetPrompt?: string;
};

const PRIORITY_RANK: Record<InsightPriority, number> = { high: 0, medium: 1, low: 2 };

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function confidenceCopy(confidence: ReturnType<typeof groupRecentScans>[number]['confidence']): string {
  if (!confidence.interval) return 'No confidence range is available.';
  return `${confidence.level} confidence; 95% repeatability range ${Math.round(confidence.interval.lower * 100)}–${Math.round(confidence.interval.upper * 100)}%.`;
}

/** Build suggestions only from the latest canonical measurement for each prompt. */
export function buildInsights(scans: readonly LLMScan[]): Insight[] {
  const groups = groupRecentScans(scans)
    .filter((group) => group.runId)
    .sort((left, right) => Date.parse(right.scannedAt) - Date.parse(left.scannedAt));
  const latest = new Map<string, (typeof groups)[number]>();
  for (const group of groups) {
    const key = group.prompt.trim().toLocaleLowerCase();
    if (key && !latest.has(key)) latest.set(key, group);
  }

  const insights: Insight[] = [];
  for (const group of latest.values()) {
    const short = group.prompt.length > 54 ? `${group.prompt.slice(0, 51)}…` : group.prompt;
    if (group.failedSamples > 0) {
      insights.push({
        id: `partial-${slug(group.prompt)}`, category: 'audit', priority: 'high',
        title: `Partial evidence for "${short}"`,
        detail: `${group.sampleCount} samples succeeded and ${group.failedSamples} failed in the latest run. No action is ranked until the provider failure is reviewed.`,
        actionLabel: 'Review run', actionHref: '/dashboard/llm-tracker', targetPrompt: group.prompt,
      });
      continue;
    }
    if (group.sampleCount < 4 || group.mentionRate === null) {
      insights.push({
        id: `sample-${slug(group.prompt)}`, category: 'visibility', priority: 'medium',
        title: `More evidence needed for "${short}"`,
        detail: `The latest run has ${group.sampleCount} successful sample${group.sampleCount === 1 ? '' : 's'}. Aelo requires at least four before suggesting visibility work.`,
        actionLabel: 'Run measurement', actionHref: '/dashboard/llm-tracker', targetPrompt: group.prompt,
      });
      continue;
    }

    const confidence = confidenceCopy(group.confidence);
    const rival = group.competitors[0];
    const providerSource = group.citations.find((citation) =>
      citation.provenance === 'provider_citation' && !citation.is_own_domain,
    );
    if (group.mentionCount === 0) {
      insights.push({
        id: `gap-${slug(group.prompt)}`, category: rival ? 'narrative' : 'visibility', priority: 'high',
        title: rival ? `${rival} appeared where you were absent` : `No observed mentions for "${short}"`,
        detail: `Your brand appeared in 0 of ${group.sampleCount} successful samples for "${short}". ${confidence} This describes the saved run, not every AI answer.`,
        actionLabel: providerSource ? 'Review sources' : 'Repeat measurement',
        actionHref: providerSource ? '/dashboard/sources' : '/dashboard/llm-tracker',
        targetPrompt: group.prompt,
      });
    } else if (group.mentionRate < 0.5) {
      insights.push({
        id: `weak-${slug(group.prompt)}`, category: 'visibility', priority: 'medium',
        title: `Inconsistent coverage for "${short}"`,
        detail: `Your brand appeared in ${group.mentionCount} of ${group.sampleCount} successful samples (${Math.round(group.mentionRate * 100)}%). ${confidence}`,
        actionLabel: 'Review sources', actionHref: '/dashboard/sources', targetPrompt: group.prompt,
      });
    } else if (group.averageMentionPosition !== null && group.averageMentionPosition > 3) {
      insights.push({
        id: `position-${slug(group.prompt)}`, category: 'visibility', priority: 'low',
        title: `Lower-list mentions for "${short}"`,
        detail: `Among samples that mentioned your brand, its observed average list position was ${group.averageMentionPosition.toFixed(1)}. ${confidence}`,
        actionLabel: 'Review evidence', actionHref: '/dashboard/llm-tracker', targetPrompt: group.prompt,
      });
    }

    if (group.sentiment === 'negative') {
      insights.push({
        id: `sentiment-${slug(group.prompt)}`, category: 'sentiment', priority: 'high',
        title: `Repeated answers leaned negative for "${short}"`,
        detail: 'Negative was the stable sentiment label across the latest successful samples. Treat this as a review cue, not proof of broad market perception.',
        actionLabel: 'Review evidence', actionHref: '/dashboard/llm-tracker', targetPrompt: group.prompt,
      });
    }
  }

  insights.sort((left, right) => PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority]);
  return insights.slice(0, 18);
}
