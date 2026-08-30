// Client-ready report: aggregate a workspace's scans into the shape an agency
// hands a client. Per-engine mention rates, prompt-level breakdown, competitor
// share, sentiment, over a window. This is the productized version of the
// spreadsheet operators build by hand.
import { createClient } from '@/lib/supabase/server';
import { estimateMentionConfidence } from '@/lib/measurement/confidence';
import type { MeasurementConfidenceLevel } from '@/lib/measurement/types';

const ENGINE_LABEL: Record<string, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    claude: 'Claude',
    perplexity: 'Perplexity',
    google_ai: 'Google AI Overview',
    bing_copilot: 'Copilot',
};

export type ReportEngine = {
    platform: string;
    label: string;
    tested: number;
    mentioned: number;
    mentionRate: number;      // 0-100
    confidence: MeasurementConfidenceLevel;
    confidenceInterval: { lower: number; upper: number } | null;
    avgPosition: number | null;
};

export type ReportPrompt = {
    prompt: string;
    engines: string[];
    mentioned: number;
    tested: number;
    bestPosition: number | null;
};

export type Report = {
    brand: string;
    periodDays: number;
    from: string;
    to: string;
    totalScans: number;
    uniquePrompts: number;
    overallMentionRate: number | null;    // 0-100, null when unmeasured
    overallConfidence: MeasurementConfidenceLevel;
    overallConfidenceInterval: { lower: number; upper: number } | null;
    avgPosition: number | null;
    engines: ReportEngine[];
    prompts: ReportPrompt[];
    competitors: { name: string; count: number }[];
    sentiment: { positive: number; neutral: number; negative: number };
    generatedAt: string;
};

type Row = {
    platform: string;
    prompt: string;
    brand_mentioned: boolean;
    mention_position: number | null;
    sentiment: string | null;
    competitors_mentioned: string[] | null;
    created_at: string;
};

export async function buildReport(workspaceId: string, brand: string, days = 30): Promise<Report> {
    const supabase = await createClient();
    const sinceDate = new Date(Date.now() - days * 86400000);
    const since = sinceDate.toISOString();

    const { data, error } = await supabase
        .from('llm_scans')
        .select('platform, prompt, brand_mentioned, mention_position, sentiment, competitors_mentioned, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to build report: ${error.message}`);

    const scans = (data ?? []) as Row[];

    // Per engine
    const byEngine = new Map<string, { tested: number; mentioned: number; positions: number[] }>();
    // Per prompt
    const byPrompt = new Map<string, { engines: Set<string>; mentioned: number; tested: number; positions: number[] }>();
    const competitors = new Map<string, { name: string; count: number }>();
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    let mentionedTotal = 0;
    const allPositions: number[] = [];

    for (const s of scans) {
        const e = byEngine.get(s.platform) ?? { tested: 0, mentioned: 0, positions: [] };
        e.tested += 1;
        if (s.brand_mentioned) {
            e.mentioned += 1;
            mentionedTotal += 1;
            if (s.mention_position != null) { e.positions.push(s.mention_position); allPositions.push(s.mention_position); }
        }
        byEngine.set(s.platform, e);

        const p = byPrompt.get(s.prompt) ?? { engines: new Set<string>(), mentioned: 0, tested: 0, positions: [] };
        p.engines.add(s.platform);
        p.tested += 1;
        if (s.brand_mentioned) { p.mentioned += 1; if (s.mention_position != null) p.positions.push(s.mention_position); }
        byPrompt.set(s.prompt, p);

        if (s.sentiment === 'positive') sentiment.positive += 1;
        else if (s.sentiment === 'negative') sentiment.negative += 1;
        else if (s.sentiment === 'neutral') sentiment.neutral += 1;

        const seenCompetitors = new Set<string>();
        for (const c of s.competitors_mentioned ?? []) {
            const name = (c || '').trim();
            const key = name.toLocaleLowerCase();
            if (!key || seenCompetitors.has(key)) continue;
            seenCompetitors.add(key);
            const current = competitors.get(key);
            competitors.set(key, { name: current?.name ?? name, count: (current?.count ?? 0) + 1 });
        }
    }

    const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

    const engines: ReportEngine[] = [...byEngine.entries()]
        .map(([platform, v]) => {
            const confidence = estimateMentionConfidence(v.mentioned, v.tested);
            return {
                platform,
                label: ENGINE_LABEL[platform] ?? platform,
                tested: v.tested,
                mentioned: v.mentioned,
                mentionRate: Math.round((confidence.mentionRate ?? 0) * 100),
                confidence: confidence.level,
                confidenceInterval: confidence.interval,
                avgPosition: avg(v.positions),
            };
        })
        .sort((a, b) => b.mentionRate - a.mentionRate);

    const prompts: ReportPrompt[] = [...byPrompt.entries()]
        .map(([prompt, v]) => ({
            prompt,
            engines: [...v.engines].map(e => ENGINE_LABEL[e] ?? e),
            mentioned: v.mentioned,
            tested: v.tested,
            bestPosition: v.positions.length ? Math.min(...v.positions) : null,
        }))
        .sort((a, b) => (b.mentioned / b.tested) - (a.mentioned / a.tested));

    const topCompetitors = [...competitors.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    const overallConfidence = estimateMentionConfidence(mentionedTotal, scans.length);
    return {
        brand,
        periodDays: days,
        from: sinceDate.toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
        totalScans: scans.length,
        uniquePrompts: byPrompt.size,
        overallMentionRate: overallConfidence.mentionRate === null ? null : Math.round(overallConfidence.mentionRate * 100),
        overallConfidence: overallConfidence.level,
        overallConfidenceInterval: overallConfidence.interval,
        avgPosition: avg(allPositions),
        engines,
        prompts,
        competitors: topCompetitors,
        sentiment,
        generatedAt: new Date().toISOString(),
    };
}
