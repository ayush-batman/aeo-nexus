import { matchesBrand } from './brand-matching';

export type AnswerNameCandidate = { name: string; evidence: string };

const MAX_CANDIDATES = 8;
const MAX_EVIDENCE_LENGTH = 240;
const FORMATTED_CHOICE = /^\s*(?:[-*•]|\d+[.)])\s+\*\*([^*\n]{2,60})\*\*\s+(?:(?:is|offers|provides|works|has)\b|[—–:-])/i;
const GENERIC_HEADINGS = new Set([
  'key features', 'features', 'pricing', 'price', 'pros', 'cons', 'advantages',
  'disadvantages', 'considerations', 'summary', 'conclusion', 'best for',
  'why choose it', 'overall', 'note', 'important', 'this tool', 'the platform',
  'free plan', 'paid plan', 'alternatives', 'other options',
]);

/** Candidate names are exact answer text, not verified competitors or recommendations. */
export function extractAnswerNameCandidates(response: string, brandName: string): AnswerNameCandidate[] {
  const candidates: AnswerNameCandidate[] = [];
  const seen = new Set<string>();
  for (const line of response.split(/\r?\n/)) {
    if (candidates.length >= MAX_CANDIDATES) break;
    const match = FORMATTED_CHOICE.exec(line);
    if (!match) continue;
    const name = match[1].trim();
    const normalized = name.toLocaleLowerCase('en-US');
    if (!/^[\p{L}\p{N}][\p{L}\p{N} .&+'’()-]*$/u.test(name) ||
      GENERIC_HEADINGS.has(normalized) || seen.has(normalized) || matchesBrand(name, [brandName]).matched) continue;
    const evidence = line.trimStart().slice(0, MAX_EVIDENCE_LENGTH).trimEnd();
    if (!response.includes(evidence) || !evidence.includes(`**${match[1]}**`)) continue;
    seen.add(normalized);
    candidates.push({ name, evidence });
  }
  return candidates;
}
