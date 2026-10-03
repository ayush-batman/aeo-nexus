export const BRAND_MATCHING_CORPUS_VERSION = '2026-08-29.1';

export interface BrandMatch {
  matched: boolean;
  aliases: string[];
  positions: number[];
  corpusVersion: string;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

function looksLikeHostname(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value.trim()) || value.includes('.');
}

export function normalizeBrandHostname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input || /\s/.test(input)) return null;

  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const hostname = url.hostname.toLocaleLowerCase('en-US').replace(/\.$/, '').replace(/^www\./, '');
    return hostname && hostname.includes('.') ? hostname : null;
  } catch {
    return null;
  }
}

export function hostnameMatchesBrand(candidate: unknown, brandDomain: unknown): boolean {
  const hostname = normalizeBrandHostname(candidate);
  const brandHostname = normalizeBrandHostname(brandDomain);
  if (!hostname || !brandHostname) return false;
  return hostname === brandHostname || hostname.endsWith(`.${brandHostname}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function aliasPattern(alias: string): string {
  return normalizeText(alias)
    .split(' ')
    .filter(Boolean)
    .map(escapeRegExp)
    .join('[\\s\\p{Pd}_]+');
}

function isShortAlias(alias: string): boolean {
  return normalizeText(alias).replace(/[^\p{L}\p{N}]/gu, '').length <= 2;
}

function findNamePositions(text: string, alias: string): number[] {
  const core = aliasPattern(alias);
  if (!core) return [];

  const boundaryStart = '(?<![\\p{L}\\p{N}])';
  const boundaryEnd = '(?=$|[^\\p{L}\\p{N}])';
  const suffix = isShortAlias(alias) ? '' : "(?:['’]s|s)?";
  const pattern = new RegExp(`${boundaryStart}${core}${suffix}${boundaryEnd}`, 'giu');
  const positions = Array.from(text.matchAll(pattern), (match) => match.index ?? 0);

  if (!isShortAlias(alias)) return positions;

  const context = '(?:brand|company|platform|product|app)';
  const contextualPattern = new RegExp(
    `(?:${context}\\s+(?:named\\s+)?${core}|${core}\\s+${context}|${core}[®™])`,
    'giu',
  );
  return Array.from(text.matchAll(contextualPattern), (match) => match.index ?? 0);
}

function findDomainPositions(text: string, brandDomain: string): number[] {
  const pattern = /(?:https?:\/\/)?(?:[\p{L}\p{N}-]+\.)+[\p{L}\p{N}-]+(?::\d+)?(?:\/[^\s<>]*)?/giu;
  const positions: number[] = [];
  for (const match of text.matchAll(pattern)) {
    if (hostnameMatchesBrand(match[0], brandDomain)) positions.push(match.index ?? 0);
  }
  return positions;
}

export function matchesBrand(text: unknown, aliases: readonly string[]): BrandMatch {
  if (typeof text !== 'string' || !text || !Array.isArray(aliases)) {
    return { matched: false, aliases: [], positions: [], corpusVersion: BRAND_MATCHING_CORPUS_VERSION };
  }

  const normalizedText = text.normalize('NFKC');
  const matchedAliases: string[] = [];
  const positions: number[] = [];

  for (const rawAlias of aliases) {
    if (typeof rawAlias !== 'string' || !rawAlias.trim()) continue;
    const found = looksLikeHostname(rawAlias)
      ? findDomainPositions(normalizedText, rawAlias)
      : findNamePositions(normalizedText, rawAlias);
    if (found.length) {
      matchedAliases.push(rawAlias);
      positions.push(...found);
    }
  }

  return {
    matched: matchedAliases.length > 0,
    aliases: matchedAliases,
    positions: positions.sort((left, right) => left - right),
    corpusVersion: BRAND_MATCHING_CORPUS_VERSION,
  };
}
