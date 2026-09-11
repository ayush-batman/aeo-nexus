'use node';
import { createHash } from 'node:crypto';
import { v } from 'convex/values';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { enrichBrandFromUrl } from '../lib/services/brand-enrichment';
import { auditUrl } from '../lib/ai/technical-audit';
import { scanLLM, getAvailablePlatforms } from '../lib/ai/llm-scanner';
import { estimateMentionConfidence } from '../lib/measurement/confidence';
import type { ActionCtx } from './_generated/server';

async function protect(ctx: ActionCtx, ip: string, namespace: string, limit: number) {
  if (!ip || ip.length > 200) throw new Error('invalid_client_address');
  const result = await ctx.runMutation(internal.abuse.check, { namespace, key: createHash('sha256').update(ip).digest('hex'), limit, interval: 3600000 });
  if (!result.ok) throw new Error('rate_limit_exceeded');
}
export const brand = internalAction({ args: { ip: v.string(), url: v.string() }, returns: v.string(), handler: async (ctx, args) => {
  const url = auditUrl(args.url).href;
  await protect(ctx, args.ip, 'brand-enrichment', 5);
  return JSON.stringify({ success: true, data: await enrichBrandFromUrl(url) });
} });
export const prompts = internalAction({
  args: { ip: v.string(), query: v.string(), brandName: v.optional(v.string()), industry: v.optional(v.string()), mode: v.optional(v.string()) },
  returns: v.object({ autocomplete: v.array(v.string()), peopleAlsoAsk: v.array(v.string()), relatedQueries: v.array(v.string()),
    sourceStatus: v.record(v.string(), v.string()), evidenceStatus: v.literal('mixed_labelled_suggestions') }),
  handler: async (ctx, args) => {
    const mode = args.mode || 'all';
    if (args.query.trim().length < 2 || args.query.length > 500 || (args.brandName?.length ?? 0) > 200 || (args.industry?.length ?? 0) > 1000 || !['all', 'autocomplete', 'paa'].includes(mode)) throw new Error('invalid_discovery');
    await protect(ctx, args.ip, 'prompt-discovery', 10);
    const result = { autocomplete: [] as string[], peopleAlsoAsk: [] as string[], relatedQueries: [] as string[], sourceStatus: {} as Record<string, string>, evidenceStatus: 'mixed_labelled_suggestions' as const };
    const autocomplete = async (query: string) => {
      const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('autocomplete_unavailable');
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !Array.isArray(data[1]) || !data[1].every(s => typeof s === 'string')) throw new Error('invalid_autocomplete');
      return data[1].filter((s: string) => s.length <= 500).slice(0, 10) as string[];
    };
    const jobs: Promise<void>[] = [];
    if (mode !== 'paa') for (const [key, query] of [['autocomplete', args.query], ['related_vs', `${args.query} vs`], ['related_best', `best ${args.query}`]]) {
      jobs.push(autocomplete(query).then(rows => { if (key === 'autocomplete') result.autocomplete = rows; else result.relatedQueries.push(...rows.slice(0, 5)); result.sourceStatus[key] = rows.length ? 'ok' : 'empty'; }).catch(() => { result.sourceStatus[key] = 'failed'; }));
    }
    if (mode !== 'autocomplete') {
      const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!key) result.sourceStatus.ai_suggestions = 'not_configured';
      else jobs.push((async () => {
        try {
          const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: process.env.CONTENT_MODEL || 'gemini-2.5-flash' });
          const response = await model.generateContent(`Brainstorm 10 possible buyer questions for this brief. These are not observed searches or actual Google People Also Ask results. Do not imply search volume or certainty of AI inclusion. Return one question per line, ending with ?. Brief: ${JSON.stringify({ topic: args.query, brand: args.brandName, industry: args.industry })}`, { timeout: 60000 });
          result.peopleAlsoAsk = response.response.text().split('\n').map(s => s.replace(/^\d+[.)]\s*/, '').trim()).filter(s => s.length > 10 && s.length <= 500 && s.endsWith('?')).slice(0, 10);
          result.sourceStatus.ai_suggestions = result.peopleAlsoAsk.length ? 'ok' : 'failed';
        } catch { result.sourceStatus.ai_suggestions = 'failed'; }
      })());
    }
    await Promise.all(jobs);
    if (!Object.values(result.sourceStatus).some(s => s === 'ok' || s === 'empty')) throw new Error('discovery_sources_unavailable');
    result.relatedQueries = [...new Set(result.relatedQueries)];
    return result;
  },
});
export const freeScan = internalAction({ args: { ip: v.string(), brandName: v.string() }, returns: v.string(), handler: async (ctx, args) => {
  const brandName = args.brandName.trim();
  if (brandName.length < 2 || brandName.length > 80) throw new Error('invalid_public_scan');
  await protect(ctx, args.ip, 'free-scan', 3);
  const configured = getAvailablePlatforms().filter(p => p.available);
  if (!configured.length) throw new Error('no_engines_available');
  // Pick a configured engine once; switching after a failure would hide failed
  // observations and change the advertised engine. Never try mock providers.
  const platform = configured[0].platform;
  const prompt = `What is ${brandName}? Explain what you know about this company or product. If you lack reliable information, say so explicitly.`;
  const output = await scanLLM({ brandName, prompt, platforms: [platform] });
  const scan = output.results[0];
  if (!scan || !scan.response.trim()) throw new Error('free_scan_provider_failed');
  const confidence = estimateMentionConfidence(Number(scan.brandMentioned), 1);
  return JSON.stringify({ platform: scan.platform, mentioned: scan.brandMentioned, sentiment: scan.sentiment,
    visibilityScore: scan.brandMentioned ? 100 : 0, samples: 1, confidence: confidence.level, confidenceInterval: confidence.interval,
    snippet: scan.response.slice(0, 200) + (scan.response.length > 200 ? '…' : ''), limitedView: true,
    note: 'One API answer, not a stable trend or a consumer-app result. This is an unsaved preview.',
    message: 'Create an account for saved, multi-sample evidence.' });
} });
