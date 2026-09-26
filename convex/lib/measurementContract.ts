import { v } from 'convex/values';
import { engineValidator, measurementModeValidator, measurementStatusValidator, nullableNumber, nullableString, sentimentValidator } from '../validators';
export const recommendationStatus = v.union(v.literal('recommended'), v.literal('not_recommended'), v.literal('unassessed'), v.literal('not_mentioned'));

export const legacyCitation = v.object({ url: v.string(), title: v.string(), is_own_domain: v.boolean(),
  provenance: v.union(v.literal('provider_citation'), v.literal('link_mentioned'), v.literal('unverified')),
  provider: v.string(), sample_id: v.string(), raw_provider_reference: v.any(),
  fetch_validation: v.union(v.literal('not_checked'), v.literal('valid'), v.literal('invalid'), v.literal('blocked')) });
export const scanResult = v.object({ platform: engineValidator, prompt: v.string(), response: v.string(),
  brandMentioned: v.boolean(), brandVariants: v.array(v.string()), mentionPosition: nullableNumber,
  sentiment: v.union(sentimentValidator, v.null()), sentimentScore: v.number(), sentimentReason: v.string(),
  competitorsMentioned: v.array(v.string()), competitorPositions: v.array(v.object({ name: v.string(), position: nullableNumber, sentiment: v.string() })),
  citations: v.array(legacyCitation), sampleId: v.string(), listItems: v.array(v.string()), confidence: v.number(), timestamp: v.string(),
  providerModel: v.optional(v.string()), measurementRegion: v.optional(v.string()), measurementMode: v.optional(measurementModeValidator),
  scorerVersion: v.optional(v.string()), measurementContractVersion: v.optional(v.string()), measurementRunId: v.optional(v.string()),
  sampleNumber: v.optional(v.number()), searchMode: v.optional(v.string()), analyzerMethod: v.optional(v.string()),
  analyzerModel: v.optional(v.string()), analyzerPromptVersion: v.optional(v.string()),
  recommendationStatus: v.optional(recommendationStatus), recommendationEvidence: v.optional(nullableString), recommendationMethod: v.optional(nullableString),
  winner: v.optional(nullableString), winnerReason: v.optional(v.string()) });

export const measurementInput = v.object({ prompt: v.string(), brandName: v.string(),
  brandDomain: v.optional(v.string()), competitors: v.optional(v.array(v.string())),
  platforms: v.array(engineValidator), samples: v.number(), mode: v.optional(measurementModeValidator) });
const confidence = v.object({ level: v.union(v.literal('none'), v.literal('low'), v.literal('medium'), v.literal('high')),
  sampleCount: v.number(), mentions: v.number(), mentionRate: nullableNumber,
  interval: v.union(v.null(), v.object({ lower: v.number(), upper: v.number(), confidence: v.literal(0.95), method: v.literal('wilson') })) });
const sample = v.object({ sampleNumber: v.number(), engine: engineValidator, providerModel: nullableString,
  region: v.string(), mode: measurementModeValidator, scorerVersion: v.string(),
  searchMode: v.optional(nullableString), analyzerMethod: v.optional(nullableString),
  analyzerModel: v.optional(nullableString), analyzerPromptVersion: v.optional(nullableString),
  recommendationStatus: v.optional(recommendationStatus), recommendationEvidence: v.optional(nullableString), recommendationMethod: v.optional(nullableString),
  status: v.union(v.literal('succeeded'), v.literal('failed')), sampleId: nullableString,
  mentioned: v.union(v.boolean(), v.null()), position: nullableNumber, sentiment: nullableString,
  responseSnippet: nullableString, analyzerConfidence: nullableNumber, citations: v.array(legacyCitation), error: nullableString });
export const measurementResult = v.object({ contractVersion: v.string(), runId: v.string(), scorerVersion: v.string(),
  region: v.string(), mode: measurementModeValidator, prompt: v.string(), brandName: v.string(),
  requestedEngines: v.array(engineValidator), requestedSamplesPerEngine: v.number(), status: measurementStatusValidator,
  visibilityScore: nullableNumber,
  engines: v.array(v.object({ engine: engineValidator, providerModels: v.array(v.string()), requestedSamples: v.number(),
    successfulSamples: v.number(), failedSamples: v.number(), mentions: v.number(), mentionRate: nullableNumber,
    mentioned: v.union(v.boolean(), v.null()), avgPosition: nullableNumber, sentiment: nullableString, confidence,
    citations: v.array(legacyCitation), evidence: v.array(sample) })),
  samples: v.array(sample), failures: v.array(v.object({ sampleNumber: v.number(), engine: engineValidator, error: v.string() })),
  persistence: v.object({ status: v.union(v.literal('stored'), v.literal('failed'), v.literal('not_applicable')),
    rows: v.number(), error: nullableString }), startedAt: v.string(), completedAt: v.string() });
