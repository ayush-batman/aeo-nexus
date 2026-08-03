// Demo-seed mode, AELO_DEMO_SEED=1 (server env, never set in production).
//
// Purpose: screenshots, sales demos and investor decks need the newest
// analytics surfaces (Drift, Positioning, Accuracy) to render with
// representative data before a workspace has accumulated weeks of scans.
// The payloads below are clearly-labeled sample data for the demo
// workspace narrative (Notion vs Confluence/Obsidian/Slite), they never
// touch the database and are unreachable unless the flag is set.

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
        { platform: 'Chatgpt',    score: 84, change: 12, scanCount: 6 },
        { platform: 'Gemini',     score: 90, change: 8,  scanCount: 9 },
        { platform: 'Perplexity', score: 71, change: 5,  scanCount: 4 },
        { platform: 'Claude',     score: 66, change: -4, scanCount: 4 },
    ];
}

export function demoScanRows() {
    const ago = (d: number, h = 0) =>
        new Date(Date.now() - (d * 24 + h) * 3600_000).toISOString();
    const mk = (id: string, platform: string, prompt: string, mentioned: boolean,
                pos: number | null, sentiment: string | null, comps: string[], d: number, h = 0) => ({
        id: `demo-${id}`,
        workspace_id: 'demo',
        platform, prompt,
        response: `Representative demo answer naming Notion alongside ${comps.join(', ') || 'alternatives'} for "${prompt}".`,
        brand_mentioned: mentioned,
        mention_position: pos,
        sentiment,
        competitors_mentioned: comps,
        citations: [],
        created_at: ago(d, h),
    });

    return [
        mk('1', 'chatgpt',            'best team wiki for startups in 2026',   true, 1, 'positive', ['Confluence', 'Slite'],   0, 2),
        mk('2', 'gemini',             'best team wiki for startups in 2026',   true, 1, 'positive', ['Confluence'],            0, 5),
        mk('3', 'perplexity',         'best note-taking apps for teams',       true, 2, 'positive', ['Obsidian'],              1),
        mk('4', 'chatgpt',            'notion vs confluence for enterprises',  true, 2, 'neutral',  ['Confluence'],            1, 6),
        mk('5', 'claude',             'best team wiki for startups in 2026',   true, 1, 'positive', ['Confluence', 'Slite'],   2),
        mk('6', 'google_ai_overview', 'best note-taking apps for teams',       true, 2, 'positive', ['Obsidian', 'Evernote'],  2, 8),
        mk('7', 'perplexity',         'tools for async remote teams',          true, 3, 'neutral',  ['Slack'],                 3),
        mk('8', 'claude',             'best note-taking apps for teams',       false, null, null,   [],                        4),
    ];
}

export function demoDashboardStats() {
    return {
        aeoHealthScore: 72,
        aeoScoreChange: 6,
        llmVisibility: 78,
        llmVisibilityChange: 9,
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
