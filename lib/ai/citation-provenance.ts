import type { CitationEvidence, CitationFetchValidation } from '../types';
import { hostnameMatchesBrand } from './brand-matching';

interface CitationContext {
  provider: string;
  sampleId: string;
  brandDomain?: string;
}

type ProviderCitationObject = Record<string, unknown>;
type CitationRedirectFetcher = (
  input: string,
  init: { method: 'HEAD'; redirect: 'manual'; signal: AbortSignal },
) => Promise<{ status: number; headers: { get(name: string): string | null } }>;

const GEMINI_REDIRECT_HOST = 'vertexaisearch.cloud.google.com';
const GEMINI_REDIRECT_PATH = '/grounding-api-redirect/';
const CITATION_REDIRECT_TIMEOUT_MS = 5_000;
const MAX_CITATION_REDIRECT_CONCURRENCY = 6;

function asRecord(value: unknown): ProviderCitationObject | null {
  return value && typeof value === 'object' ? value as ProviderCitationObject : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function extractPerplexityCitationReferences(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return [];
  return [...asArray(root.citations), ...asArray(root.search_results)];
}

export function openAIUsedWebSearch(payload: unknown): boolean {
  const root = asRecord(payload);
  return asArray(root?.output).some((item) => asRecord(item)?.type === 'web_search_call');
}

export function geminiUsedWebSearch(payload: unknown): boolean {
  const root = asRecord(payload);
  return asArray(root?.candidates).some((candidateValue) => {
    const metadata = asRecord(asRecord(candidateValue)?.groundingMetadata);
    return asArray(metadata?.groundingChunks).length > 0 || asArray(metadata?.webSearchQueries).length > 0;
  });
}

export function anthropicUsedWebSearch(payload: unknown): boolean {
  const root = asRecord(payload);
  return asArray(root?.content).some((blockValue) => {
    const block = asRecord(blockValue);
    return block?.type === 'web_search_tool_result' ||
      (block?.type === 'server_tool_use' && block?.name === 'web_search');
  });
}

export function extractGeminiCitationReferences(response: unknown): unknown[] {
  const root = asRecord(response);
  const references: unknown[] = [];
  for (const candidateValue of asArray(root?.candidates)) {
    const candidate = asRecord(candidateValue);
    const metadata = asRecord(candidate?.groundingMetadata);
    for (const chunkValue of asArray(metadata?.groundingChunks)) {
      const chunk = asRecord(chunkValue);
      const source = asRecord(chunk?.web) ?? asRecord(chunk?.retrievedContext);
      if (source) references.push({
        url: source.uri ?? source.url,
        title: source.title,
      });
    }
  }
  return references;
}

function wrappedGeminiReference(reference: unknown, url: string, unresolved: boolean): ProviderCitationObject {
  return {
    __aeloGeminiRedirect: true,
    url,
    title: referenceTitle(reference),
    originalReference: reference,
    unresolved,
  };
}

async function resolveGeminiReference(reference: unknown, fetcher: CitationRedirectFetcher): Promise<unknown> {
  const rawUrl = referenceUrl(reference);
  if (!rawUrl) return reference;
  let redirectUrl: URL;
  try { redirectUrl = new URL(rawUrl); } catch { return reference; }
  if (redirectUrl.protocol !== 'https:' || redirectUrl.hostname !== GEMINI_REDIRECT_HOST ||
      !redirectUrl.pathname.startsWith(GEMINI_REDIRECT_PATH)) return reference;

  try {
    const response = await fetcher(redirectUrl.toString(), {
      method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(CITATION_REDIRECT_TIMEOUT_MS),
    });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return wrappedGeminiReference(reference, redirectUrl.toString(), true);
    }
    const resolved = inspectUrl(new URL(location, redirectUrl).toString());
    if (resolved.validation !== 'not_checked' || resolved.hostname === GEMINI_REDIRECT_HOST) {
      return wrappedGeminiReference(reference, redirectUrl.toString(), true);
    }
    return wrappedGeminiReference(reference, resolved.url, false);
  } catch {
    return wrappedGeminiReference(reference, redirectUrl.toString(), true);
  }
}

export async function resolveGeminiCitationReferences(
  references: readonly unknown[],
  fetcher: CitationRedirectFetcher = (input, init) => fetch(input, init),
): Promise<unknown[]> {
  const resolved: unknown[] = [];
  for (let offset = 0; offset < references.length; offset += MAX_CITATION_REDIRECT_CONCURRENCY) {
    resolved.push(...await Promise.all(references.slice(offset, offset + MAX_CITATION_REDIRECT_CONCURRENCY)
      .map((reference) => resolveGeminiReference(reference, fetcher))));
  }
  return resolved;
}

export function extractOpenAICitationReferences(completion: unknown): unknown[] {
  const root = asRecord(completion);
  const firstChoice = asRecord(asArray(root?.choices)[0]);
  const message = asRecord(firstChoice?.message);
  const references: unknown[] = [];
  // Keep the legacy Chat Completions shape for compatible callers.
  for (const annotationValue of asArray(message?.annotations)) {
    const annotation = asRecord(annotationValue);
    const citation = asRecord(annotation?.url_citation) ?? annotation;
    if (citation?.url) references.push({ url: citation.url, title: citation.title });
  }
  // The Responses API puts web citations on output message text parts.
  for (const outputValue of asArray(root?.output)) {
    const output = asRecord(outputValue);
    for (const contentValue of asArray(output?.content)) {
      const content = asRecord(contentValue);
      for (const annotationValue of asArray(content?.annotations)) {
        const annotation = asRecord(annotationValue);
        if (annotation?.type === 'url_citation' && typeof annotation.url === 'string') {
          references.push({ url: annotation.url, title: annotation.title });
        }
      }
    }
  }
  return references;
}

export function extractAnthropicCitationReferences(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const references: unknown[] = [];
  for (const blockValue of asArray(root?.content)) {
    const block = asRecord(blockValue);
    for (const citationValue of asArray(block?.citations)) {
      const citation = asRecord(citationValue);
      const source = asRecord(citation?.source);
      const url = citation?.url ?? source?.url;
      if (url) references.push({ url, title: citation?.title ?? source?.title });
    }
  }
  return references;
}

function referenceUrl(reference: unknown): string | null {
  if (typeof reference === 'string') return reference;
  if (!reference || typeof reference !== 'object') return null;
  const object = reference as ProviderCitationObject;
  for (const key of ['url', 'link', 'uri']) {
    if (typeof object[key] === 'string') return object[key] as string;
  }
  return null;
}

function referenceTitle(reference: unknown): string | null {
  if (!reference || typeof reference !== 'object') return null;
  const object = reference as ProviderCitationObject;
  for (const key of ['title', 'name']) {
    if (typeof object[key] === 'string' && object[key]) return object[key] as string;
  }
  return null;
}

function blockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  if (host.includes(':')) {
    return host === '::' || /^f[cd][0-9a-f]{2}:/i.test(host) ||
      /^fe[89ab][0-9a-f]:/i.test(host) || host.startsWith('::ffff:');
  }
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224;
}

function inspectUrl(value: string): {
  url: string;
  hostname: string | null;
  validation: CitationFetchValidation;
} {
  const cleaned = value.trim().replace(/[.,;:!?]+$/, '');
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: value, hostname: null, validation: 'invalid' };
    }
    if (blockedHostname(parsed.hostname)) {
      return { url: parsed.toString(), hostname: parsed.hostname, validation: 'blocked' };
    }
    return { url: parsed.toString(), hostname: parsed.hostname, validation: 'not_checked' };
  } catch {
    return { url: value, hostname: null, validation: 'invalid' };
  }
}

function citationFromReference(
  reference: unknown,
  context: CitationContext,
  providerNative: boolean,
): CitationEvidence | null {
  const rawUrl = referenceUrl(reference);
  if (!rawUrl) return null;
  const inspected = inspectUrl(rawUrl);
  const object = asRecord(reference);
  const wrappedGeminiRedirect = object?.__aeloGeminiRedirect === true;
  const unresolvedRedirect = wrappedGeminiRedirect && object?.unresolved === true;
  const validForEvidence = inspected.validation === 'not_checked' && !unresolvedRedirect;
  const title = referenceTitle(reference) || inspected.hostname || rawUrl;

  return {
    url: inspected.url,
    title,
    is_own_domain: inspected.hostname
      ? hostnameMatchesBrand(inspected.hostname, context.brandDomain)
      : false,
    provenance: validForEvidence
      ? (providerNative ? 'provider_citation' : 'link_mentioned')
      : 'unverified',
    provider: context.provider,
    sample_id: context.sampleId,
    raw_provider_reference: providerNative
      ? (wrappedGeminiRedirect ? object?.originalReference : reference)
      : null,
    fetch_validation: inspected.validation,
  };
}

export function extractProviderCitations(
  references: readonly unknown[],
  context: CitationContext,
): CitationEvidence[] {
  return references
    .map((reference) => citationFromReference(reference, context, true))
    .filter((citation): citation is CitationEvidence => citation !== null);
}

function extractMentionedLinks(text: string, context: CitationContext): CitationEvidence[] {
  const urls = text.match(/https?:\/\/[^\s)>\]]+/g) ?? [];
  return urls
    .map((url) => citationFromReference(url, context, false))
    .filter((citation): citation is CitationEvidence => citation !== null);
}

export function collectCitationEvidence(input: CitationContext & {
  text: string;
  providerCitations: readonly unknown[];
}): CitationEvidence[] {
  const grounded = extractProviderCitations(input.providerCitations, input);
  const mentioned = extractMentionedLinks(input.text, input);
  const byUrl = new Map<string, CitationEvidence>();

  for (const citation of [...grounded, ...mentioned]) {
    if (!byUrl.has(citation.url)) byUrl.set(citation.url, citation);
  }
  return Array.from(byUrl.values());
}
