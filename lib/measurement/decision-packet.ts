import type { VisibilityMeasurementRun } from './types';

export const DECISION_PACKET_VERSION = 'decision-packet.v1' as const;

export type DecisionPacketStatus = 'complete' | 'partial' | 'all_failed' | 'untracked';

export type DecisionPacketSourceGap = {
  domain: string;
  citations: number;
  engines: string[];
  exampleUrl: string;
};

export type DecisionPacketAction = {
  rank: 1;
  type: 'review_cited_source' | 'review_site_answer' | 'review_measurement' | 'repair_tracking';
  title: string;
  rationale: string;
  prompt: string | null;
  sourceDomain: string | null;
};

export type DecisionPacket = {
  contractVersion: typeof DECISION_PACKET_VERSION;
  id: string;
  workspaceId: string;
  brandName: string;
  status: DecisionPacketStatus;
  createdAt: string;
  prompts: string[];
  measurements: VisibilityMeasurementRun[];
  sourceGaps: DecisionPacketSourceGap[];
  rankedAction: DecisionPacketAction;
};

function sourceGaps(measurements: VisibilityMeasurementRun[]): DecisionPacketSourceGap[] {
  const byDomain = new Map<string, { citations: number; engines: Set<string>; exampleUrl: string }>();
  for (const measurement of measurements) {
    for (const engine of measurement.engines) {
      for (const citation of engine.citations) {
        if (citation.provenance !== 'provider_citation' || citation.is_own_domain) continue;
        let domain: string;
        try {
          domain = new URL(citation.url).hostname.replace(/^www\./, '');
        } catch {
          continue;
        }
        const current = byDomain.get(domain) ?? { citations: 0, engines: new Set<string>(), exampleUrl: citation.url };
        current.citations++;
        current.engines.add(engine.engine);
        byDomain.set(domain, current);
      }
    }
  }
  return [...byDomain.entries()]
    .map(([domain, value]) => ({
      domain,
      citations: value.citations,
      engines: [...value.engines].sort(),
      exampleUrl: value.exampleUrl,
    }))
    .sort((a, b) => b.citations - a.citations || a.domain.localeCompare(b.domain))
    .slice(0, 5);
}

function weakestPrompt(measurements: VisibilityMeasurementRun[]): VisibilityMeasurementRun | null {
  const ranked = measurements
    .filter(measurement => measurement.status === 'complete' && measurement.persistence.status === 'stored')
    .map(measurement => ({
      measurement,
      rate: measurement.engines.reduce((sum, engine) => sum + engine.mentions, 0) /
        Math.max(1, measurement.engines.reduce((sum, engine) => sum + engine.successfulSamples, 0)),
    }))
    .sort((a, b) => a.rate - b.rate);
  return ranked[0]?.measurement ?? null;
}

export function buildDecisionPacket(input: {
  id: string;
  workspaceId: string;
  brandName: string;
  measurements: VisibilityMeasurementRun[];
  createdAt?: string;
}): DecisionPacket {
  const gaps = sourceGaps(input.measurements);
  const weakMeasurement = weakestPrompt(input.measurements);
  const allFailed = input.measurements.length > 0 && input.measurements.every(measurement => measurement.status === 'all_failed');
  const untracked = input.measurements.some(measurement => measurement.persistence.status === 'failed');
  const partial = input.measurements.some(measurement => measurement.status !== 'complete');
  const status: DecisionPacketStatus = allFailed ? 'all_failed' : untracked ? 'untracked' : partial ? 'partial' : 'complete';
  const weakSources = weakMeasurement ? sourceGaps([weakMeasurement]) : [];

  let rankedAction: DecisionPacketAction;
  if (status !== 'complete' || !weakMeasurement) {
    rankedAction = {
      rank: 1,
      type: 'repair_tracking',
      title: 'Review the incomplete measurement before changing content',
      rationale: 'No complete, saved set of prompt measurements is available. Aelo cannot rank a content action from this packet honestly.',
      prompt: null,
      sourceDomain: null,
    };
  } else if (weakMeasurement.engines.some(engine => engine.successfulSamples < 4)) {
    rankedAction = {
      rank: 1,
      type: 'review_measurement',
      title: 'Collect more answers before changing content',
      rationale: 'At least one engine has fewer than four successful answers for this question. Repeat the measurement before treating it as a content gap.',
      prompt: weakMeasurement.prompt,
      sourceDomain: null,
    };
  } else if (weakMeasurement.engines.every(engine => engine.mentions === engine.successfulSamples)) {
    rankedAction = {
      rank: 1,
      type: 'review_measurement',
      title: 'Keep measuring before changing content',
      rationale: 'The brand appeared in every successful answer in this packet. Aelo has not observed a mention gap to fix.',
      prompt: weakMeasurement.prompt,
      sourceDomain: null,
    };
  } else if (weakSources[0]) {
    const citedSource = weakSources[0];
    rankedAction = {
      rank: 1,
      type: 'review_cited_source',
      title: `Review ${citedSource.domain}'s coverage of ${input.brandName}`,
      rationale: `This domain appeared in provider citations for the weakest measured question. Aelo has not checked whether this page already mentions ${input.brandName}; inspect it before deciding whether to pitch an update.`,
      prompt: weakMeasurement.prompt,
      sourceDomain: citedSource.domain,
    };
  } else {
    rankedAction = {
      rank: 1,
      type: 'review_site_answer',
      title: 'Review your answer to the weakest buyer question',
      rationale: 'The brand was absent from some saved answers and the provider returned no cited external page for this question. Aelo has not checked whether your website already answers it; review existing content before publishing anything new.',
      prompt: weakMeasurement.prompt,
      sourceDomain: null,
    };
  }

  return {
    contractVersion: DECISION_PACKET_VERSION,
    id: input.id,
    workspaceId: input.workspaceId,
    brandName: input.brandName,
    status,
    createdAt: input.createdAt ?? new Date().toISOString(),
    prompts: input.measurements.map(measurement => measurement.prompt),
    measurements: input.measurements,
    sourceGaps: gaps,
    rankedAction,
  };
}
