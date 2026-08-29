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
  type: 'earn_source_mention' | 'publish_direct_answer' | 'repair_tracking';
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

function weakestPrompt(measurements: VisibilityMeasurementRun[]): string | null {
  const ranked = measurements
    .filter(measurement => measurement.status !== 'all_failed' && measurement.status !== 'untracked')
    .map(measurement => ({
      prompt: measurement.prompt,
      rate: measurement.engines.reduce((sum, engine) => sum + engine.mentions, 0) /
        Math.max(1, measurement.engines.reduce((sum, engine) => sum + engine.successfulSamples, 0)),
    }))
    .sort((a, b) => a.rate - b.rate);
  return ranked[0]?.prompt ?? null;
}

export function buildDecisionPacket(input: {
  id: string;
  workspaceId: string;
  brandName: string;
  measurements: VisibilityMeasurementRun[];
  createdAt?: string;
}): DecisionPacket {
  const gaps = sourceGaps(input.measurements);
  const weakPrompt = weakestPrompt(input.measurements);
  const allFailed = input.measurements.length > 0 && input.measurements.every(measurement => measurement.status === 'all_failed');
  const untracked = input.measurements.some(measurement => measurement.persistence.status === 'failed');
  const partial = input.measurements.some(measurement => measurement.status !== 'complete');
  const status: DecisionPacketStatus = allFailed ? 'all_failed' : untracked ? 'untracked' : partial ? 'partial' : 'complete';

  let rankedAction: DecisionPacketAction;
  if (allFailed || !weakPrompt) {
    rankedAction = {
      rank: 1,
      type: 'repair_tracking',
      title: 'Restore an AI engine, then retry this packet',
      rationale: 'No successful cohort exists yet, so Aelo cannot rank a visibility action honestly.',
      prompt: null,
      sourceDomain: null,
    };
  } else if (gaps[0]) {
    rankedAction = {
      rank: 1,
      type: 'earn_source_mention',
      title: `Earn a relevant mention on ${gaps[0].domain}`,
      rationale: `This domain supplied ${gaps[0].citations} provider-backed citation${gaps[0].citations === 1 ? '' : 's'} across the measured answers and does not currently point to your own domain.`,
      prompt: weakPrompt,
      sourceDomain: gaps[0].domain,
    };
  } else {
    rankedAction = {
      rank: 1,
      type: 'publish_direct_answer',
      title: 'Publish a direct answer for the weakest buyer prompt',
      rationale: 'The brand has a measured prompt gap, but providers returned no grounded external source that Aelo can recommend targeting.',
      prompt: weakPrompt,
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
