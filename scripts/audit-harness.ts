import { loadEnvConfig } from '@next/env';
import fs from 'fs';
loadEnvConfig(process.cwd());

const OUT = '/private/tmp/claude-501/-Users-ayush-Desktop-projects/947d12b9-492d-445e-bc69-9bae80a93d35/scratchpad/results.txt';
fs.writeFileSync(OUT, '');
function log(s: string) { fs.appendFileSync(OUT, s + '\n'); }

// Wrap each test with a timeout + error capture so one failure doesn't abort the rest
async function run<T>(name: string, fn: () => Promise<T>, ms = 40000): Promise<void> {
    const start = Date.now();
    try {
        const result = await Promise.race([
            fn(),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms`)), ms)),
        ]);
        const dur = ((Date.now() - start) / 1000).toFixed(1);
        log(`\n✅ [${name}] OK (${dur}s)`);
        log(JSON.stringify(result, (k, v) => (typeof v === 'string' && v.length > 400 ? v.slice(0, 400) + '…' : v), 2));
    } catch (e: any) {
        const dur = ((Date.now() - start) / 1000).toFixed(1);
        log(`\n❌ [${name}] FAIL (${dur}s): ${e?.message || e}`);
    }
}

async function main() {
    log('=== AELO CORE ENGINE AUDIT HARNESS ===');
    log('Env keys present: ' + JSON.stringify({
        GEMINI: !!process.env.GEMINI_API_KEY,
        OPENAI: !!process.env.OPENAI_API_KEY,
        ANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
        PERPLEXITY: !!process.env.PERPLEXITY_API_KEY,
        YOUTUBE: !!process.env.YOUTUBE_API_KEY,
        GOOGLE_CSE_ID: !!process.env.GOOGLE_CSE_ID,
        REDDIT: !!process.env.REDDIT_CLIENT_ID,
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }));

    const scanner = await import('../lib/ai/llm-scanner');

    // 1. LLM Scanner per platform (real API calls)
    for (const platform of ['gemini', 'chatgpt', 'claude', 'perplexity', 'google_ai_overview'] as const) {
        await run(`scanLLM:${platform}`, async () => {
            const out = await scanner.scanLLM({
                prompt: 'What are the best running shoe brands?',
                brandName: 'Nike',
                competitors: ['Adidas'],
                platforms: [platform],
            });
            return {
                results: out.results.map(r => ({ platform: r.platform, mentioned: r.brandMentioned, position: r.mentionPosition, sentiment: r.sentiment, respLen: r.response.length })),
                errors: out.errors,
            };
        });
    }

    // 2. Prompt generation
    await run('generatePrompts', async () => {
        const p = await scanner.generatePrompts('CRM software', 'Salesforce');
        return { count: p.length, sample: p.slice(0, 3) };
    });

    // 3. Brand enrichment
    await run('enrichBrandFromUrl', async () => {
        const m = await import('../lib/services/brand-enrichment');
        return await m.enrichBrandFromUrl('https://stripe.com');
    });

    // 4. Content audit
    await run('auditContent', async () => {
        const m = await import('../lib/ai/content-analyzer');
        const r = await m.auditContent('https://stripe.com');
        return { ...r, rawHtml: undefined };
    });

    // 5. Originality scorer
    await run('scoreOriginality', async () => {
        const m = await import('../lib/ai/originality-scorer');
        return await m.scoreOriginality('Our product is the best CRM for small teams. It offers pipeline management and email automation.', 'CRM software');
    });

    // 6. Source discovery
    await run('discoverIndustrySources', async () => {
        const m = await import('../lib/services/source-discovery');
        return await m.discoverIndustrySources('SaaS CRM', 'small business owners', 'Salesforce');
    });

    // 7. Forum integration clients
    await run('stackexchange', async () => {
        const m = await import('../lib/integrations/stackexchange-client');
        const r = await m.searchStackExchange('best CRM software', { pageSize: 5 });
        return { count: r.questions.length, sample: r.questions.slice(0, 2).map((q: any) => q.title) };
    });
    await run('hackernews', async () => {
        const m = await import('../lib/integrations/hackernews-client');
        const r = await m.searchHN('CRM software', { hitsPerPage: 5 });
        return { count: r.stories.length, sample: r.stories.slice(0, 2).map((s: any) => s.title) };
    });
    await run('youtube', async () => {
        const m = await import('../lib/integrations/youtube-client');
        const r = await m.searchYouTube('best CRM software', { maxResults: 5 });
        return { count: r.videos.length, sample: r.videos.slice(0, 2).map((v: any) => v.title) };
    });
    await run('google-cse', async () => {
        const m = await import('../lib/integrations/google-search-client');
        const configured = m.isGoogleSearchConfigured();
        const r = await m.searchForums('best CRM software reddit', { limit: 5 });
        return { configured, count: r.results.length, sample: r.results.slice(0, 2).map((x: any) => x.url) };
    });
    await run('reddit', async () => {
        const m = await import('../lib/integrations/reddit-client');
        const configured = m.isRedditConfigured();
        const r = await m.searchReddit('best CRM software', { limit: 5 });
        return { configured, count: r.posts.length, sample: r.posts.slice(0, 2).map((p: any) => p.title) };
    });

    // 8. Supabase connectivity (admin)
    await run('supabase-admin-select', async () => {
        const m = await import('../lib/supabase/admin');
        const db = m.createAdminClient();
        const { data, error, count } = await db.from('llm_scans').select('id', { count: 'exact', head: true });
        if (error) throw new Error(error.message);
        return { llm_scans_count: count };
    });

    log('\n=== HARNESS COMPLETE ===');
    process.exit(0);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
