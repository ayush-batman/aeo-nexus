// Demo-seed mode, AELO_DEMO_SEED=1 (server env, never set in production).
//
// Purpose: screenshots, sales demos and investor decks need the newest
// analytics surfaces (Drift, Positioning, Accuracy) to render with
// representative data before a workspace has accumulated weeks of scans.
// The payloads below are clearly-labeled sample data for the demo
// workspace narrative (Notion vs Confluence/Obsidian/Slite), they never
// touch the database and are unreachable unless the flag is set.
import { estimateMentionConfidence } from '@/lib/measurement/confidence';

export const DEMO_SEED_ACTIVE = () => process.env.AELO_DEMO_SEED === '1';

// ── Sentiment Drift: 8 weeks × 4 tracked prompt/platform pairs ──
export function demoDriftHistory() {
    const mk = (prompt: string, platform: string, series: number[], samples = 4) =>
        series.map((avg, i) => ({
            prompt,
            platform,
            week_start: weekIso(series.length - 1 - i),
            avg_sentiment: avg,
            sample_size: samples,
        }));

    return [
        ...mk('best team wiki for startups', 'chatgpt',
            [0.52, 0.55, 0.58, 0.61, 0.57, 0.60, 0.63, 0.62], 6),
        ...mk('notion vs confluence for enterprises', 'chatgpt',
            [0.41, 0.44, 0.38, 0.42, 0.45, 0.40, 0.44, 0.06], 5),
        ...mk('best team wiki for startups', 'gemini',
            [0.48, 0.50, 0.47, 0.52, 0.55, 0.53, 0.56, 0.58], 4),
        ...mk('tools for async remote teams', 'perplexity',
            [0.33, 0.36, 0.40, 0.38, 0.42, 0.45, 0.47, 0.49], 3),
    ];
}

function weekIso(weeksAgo: number): string {
    const d = new Date();
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow) - weeksAgo * 7);
    return d.toISOString().slice(0, 10);
}

// ── Positioning Matrix: entities × attributes with frequencies ──
export function demoPositioningMatrix() {
    const cells = new Map<string, {
        entity_name: string;
        entity_type: 'brand' | 'competitor';
        attribute: string;
        frequency: number;
        avg_confidence: number;
        platforms: string[];
    }>();

    const put = (entity: string, type: 'brand' | 'competitor', attr: string, freq: number) => {
        cells.set(`${entity}|${attr}`, {
            entity_name: entity,
            entity_type: type,
            attribute: attr,
            frequency: freq,
            avg_confidence: 0.82,
            platforms: ['chatgpt', 'gemini'],
        });
    };

    // Notion (you)
    put('Notion', 'brand', 'collaboration', 14);
    put('Notion', 'brand', 'flexible databases', 11);
    put('Notion', 'brand', 'templates', 9);
    put('Notion', 'brand', 'all-in-one', 8);
    put('Notion', 'brand', 'ai features', 5);
    put('Notion', 'brand', 'enterprise', 2);
    // Confluence
    put('Confluence', 'competitor', 'enterprise', 12);
    put('Confluence', 'competitor', 'jira integration', 9);
    put('Confluence', 'competitor', 'permissions', 7);
    put('Confluence', 'competitor', 'collaboration', 4);
    // Obsidian
    put('Obsidian', 'competitor', 'local-first', 10);
    put('Obsidian', 'competitor', 'knowledge graphs', 8);
    put('Obsidian', 'competitor', 'privacy', 5);
    // Slite
    put('Slite', 'competitor', 'lightweight', 6);
    put('Slite', 'competitor', 'collaboration', 3);

    const entities = [
        { name: 'Notion',     type: 'brand'      as const, total: 49 },
        { name: 'Confluence', type: 'competitor' as const, total: 32 },
        { name: 'Obsidian',   type: 'competitor' as const, total: 23 },
        { name: 'Slite',      type: 'competitor' as const, total: 9  },
    ];
    const attributes = [
        { attribute: 'collaboration',      totalFrequency: 21 },
        { attribute: 'enterprise',         totalFrequency: 14 },
        { attribute: 'flexible databases', totalFrequency: 11 },
        { attribute: 'local-first',        totalFrequency: 10 },
        { attribute: 'templates',          totalFrequency: 9  },
        { attribute: 'jira integration',   totalFrequency: 9  },
        { attribute: 'knowledge graphs',   totalFrequency: 8  },
        { attribute: 'all-in-one',         totalFrequency: 8  },
        { attribute: 'permissions',        totalFrequency: 7  },
        { attribute: 'lightweight',        totalFrequency: 6  },
        { attribute: 'ai features',        totalFrequency: 5  },
        { attribute: 'privacy',            totalFrequency: 5  },
    ];

    return { entities, attributes, cells, lastUpdated: new Date().toISOString() };
}

// ── Dashboard + Tracker: visibility metrics, scans, stats ───────
export function demoVisibilityMetrics() {
    return [
        metric('Chatgpt', 5, 6, 4, 6),
        metric('Gemini', 8, 9, 7, 9),
        metric('Perplexity', 3, 4, 2, 4),
        metric('Claude', 2, 4, 3, 4),
    ];
}

function metric(platform: string, mentions: number, samples: number, previousMentions: number, previousSamples: number) {
    const confidence = estimateMentionConfidence(mentions, samples);
    const score = Math.round((mentions / samples) * 100);
    const previousScore = Math.round((previousMentions / previousSamples) * 100);
    return {
        platform,
        score,
        change: score - previousScore,
        changeStatus: 'comparable' as const,
        scanCount: samples,
        mentionCount: mentions,
        mentionRate: confidence.mentionRate,
        confidence,
        averageMentionPosition: 2,
        mentionPositionCount: mentions,
        mentionPositionTotal: mentions * 2,
        comparisonCurrentSamples: samples,
        comparisonCurrentMentions: mentions,
        comparisonPreviousSamples: previousSamples,
        comparisonPreviousMentions: previousMentions,
    };
}

export function demoScanRows() {
    const ago = (d: number, h = 0) =>
        new Date(Date.now() - (d * 24 + h) * 3600_000).toISOString();
    const prompts = [
        'best team wiki for startups in 2026',
        'best note-taking apps for teams',
        'notion vs confluence for enterprises',
        'tools for async remote teams',
    ];
    const modelByPlatform: Record<string, string> = {
        chatgpt: 'gpt-5-mini',
        gemini: 'gemini-2.5-flash',
        perplexity: 'sonar',
        claude: 'claude-sonnet-4',
    };
    const competitorSets = [
        ['Confluence', 'Slite'],
        ['Obsidian', 'Evernote'],
        ['Confluence'],
        ['Slack'],
    ];
    const mk = (id: string, platform: string, prompt: string, mentioned: boolean,
                pos: number | null, comps: string[], sampleIndex: number) => ({
        id: `demo-${id}`,
        workspace_id: 'demo',
        platform, prompt,
        response: `Representative demo answer naming Notion alongside ${comps.join(', ') || 'alternatives'} for "${prompt}".`,
        brand_mentioned: mentioned,
        mention_position: pos,
        sentiment: mentioned ? (sampleIndex % 3 === 0 ? 'neutral' : 'positive') : null,
        competitors_mentioned: comps,
        citations: [],
        sample_id: `demo-${platform}-sample-${sampleIndex}`,
        measurement_run_id: `demo-${platform}-run`,
        sample_index: sampleIndex,
        provider_model: modelByPlatform[platform],
        measurement_region: 'global',
        measurement_mode: 'standard',
        scorer_version: 'brand-match-v1',
        measurement_contract_version: 'measurement-v1',
        created_at: ago(Math.floor(sampleIndex / 4), sampleIndex % 4),
    });

    const cohorts = [
        { platform: 'chatgpt', samples: 6, mentions: 5 },
        { platform: 'gemini', samples: 9, mentions: 8 },
        { platform: 'perplexity', samples: 4, mentions: 3 },
        { platform: 'claude', samples: 4, mentions: 2 },
    ];
    return cohorts.flatMap(({ platform, samples, mentions }) =>
        Array.from({ length: samples }, (_, index) => {
            const mentioned = index < mentions;
            const promptIndex = index % prompts.length;
            return mk(
                `${platform}-${index + 1}`,
                platform,
                prompts[promptIndex],
                mentioned,
                mentioned ? (index % 3) + 1 : null,
                competitorSets[promptIndex],
                index + 1,
            );
        }),
    ).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoDashboardStats() {
    return {
        aeoHealthScore: 81,
        aeoScoreChange: null,
        llmVisibility: 78,
        llmVisibilityChange: 8,
        llmVisibilitySamples: 23,
        llmVisibilityConfidence: 'high' as const,
        forumThreadCount: 23,
        highPriorityThreads: 4,
        shareOfVoice: 58,
        shareOfVoiceChange: 3,
        contentScore: 74,
        pagesNeedingOptimization: 3,
    };
}

// ── Accuracy Verdict: verified-claim rows + summary ─────────────
export function demoAccuracySummary() {
    const now = new Date().toISOString();
    const rows = [
        {
            id: 'demo-1', scan_id: 'demo-s1',
            claim_text: 'Notion offers a free plan for individuals and small teams',
            verdict: 'true' as const, confidence: 0.95,
            evidence_url: 'https://notion.so/pricing',
            evidence_snippet: 'Free for individuals, up to 10 guests, unlimited pages.',
            reasoning: 'Directly supported by the live pricing page.',
            created_at: now, scan: { platform: 'chatgpt', prompt: 'best team wiki for startups', created_at: now },
        },
        {
            id: 'demo-2', scan_id: 'demo-s1',
            claim_text: 'Notion Business costs $25 per member per month',
            verdict: 'false' as const, confidence: 0.9,
            evidence_url: 'https://notion.so/pricing',
            evidence_snippet: 'Business, $15 per member / month, billed annually.',
            reasoning: 'The model overstates the price by 66% to every prospect who asks.',
            created_at: now, scan: { platform: 'chatgpt', prompt: 'notion pricing for teams', created_at: now },
        },
        {
            id: 'demo-3', scan_id: 'demo-s2',
            claim_text: 'Notion does not offer SCIM provisioning',
            verdict: 'outdated' as const, confidence: 0.85,
            evidence_url: 'https://notion.so/help/scim',
            evidence_snippet: 'SCIM provisioning is available on the Enterprise plan.',
            reasoning: 'Shipped since; the model is still repeating a pre-2024 limitation.',
            created_at: now, scan: { platform: 'gemini', prompt: 'notion for enterprise security', created_at: now },
        },
        {
            id: 'demo-4', scan_id: 'demo-s3',
            claim_text: 'Notion AI can search across connected Slack and Drive content',
            verdict: 'true' as const, confidence: 0.88,
            evidence_url: 'https://notion.so/product/ai',
            evidence_snippet: 'AI connectors: search Slack, Google Drive and more.',
            reasoning: 'Matches the current product page.',
            created_at: now, scan: { platform: 'perplexity', prompt: 'notion ai capabilities', created_at: now },
        },
        {
            id: 'demo-5', scan_id: 'demo-s3',
            claim_text: 'Offline editing is fully supported on desktop',
            verdict: 'unverified' as const, confidence: 0.4,
            evidence_url: null, evidence_snippet: null,
            reasoning: 'No definitive statement found on the site either way.',
            created_at: now, scan: { platform: 'claude', prompt: 'notion offline support', created_at: now },
        },
    ];

    const counts = { true: 2, false: 1, outdated: 1, unverified: 1 };
    return {
        total: rows.length,
        counts,
        accuracyPct: Math.round((counts.true / (counts.true + counts.false + counts.outdated)) * 100),
        rows,
        lastUpdated: now,
    };
}
