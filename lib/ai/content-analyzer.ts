import * as cheerio from 'cheerio';

export interface AuditResult {
    url: string;
    score: number;
    readability: {
        score: number;
        issues: string[];
    };
    structure: {
        h1Count: number;
        h2Count: number;
        h3Count: number;
        hasSchema: boolean;
        schemaTypes: string[];
        metaDescription: boolean;
    };
    content: {
        wordCount: number;
        qnaCount: number; // Potential Q&A pairs detected
    };
    summary: string;
}

export async function auditContent(url: string): Promise<AuditResult> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'AEO-Nexus-Bot/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. Structure Analysis
        const h1Count = $('h1').length;
        const h2Count = $('h2').length;
        const h3Count = $('h3').length;
        const metaDescription = $('meta[name="description"]').attr('content');

        // 2. Schema.org Analysis
        const schemas: string[] = [];
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html() || '{}');
                const type = json['@type'];
                if (type) {
                    if (Array.isArray(type)) {
                        schemas.push(...type);
                    } else {
                        schemas.push(type);
                    }
                }
            } catch (e) {
                // Ignore invalid JSON
            }
        });

        // 3. Content Analysis
        // Remove scripts, styles, etc.
        $('script, style, noscript, svg, iframe').remove();
        const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
        const wordCount = cleanText.split(' ').length;

        // Detect generic Q&A patterns (bold text ending in ? followed by text)
        // This is a naive heuristic but good for a baseline
        let qnaCount = 0;
        $('p, li, div').each((_, el) => {
            const text = $(el).text().trim();
            if (text.includes('?') && text.length < 150) {
                // Check if next sibling is text
                const next = $(el).next();
                if (next.length && next.text().trim().length > 20) {
                    qnaCount++;
                }
            }
        });

        // 4. Scoring Algorithm
        let score = 70; // Start baseline
        const issues: string[] = [];

        // H1 check
        if (h1Count === 0) {
            score -= 10;
            issues.push('Missing H1 tag - AI agents use this for main topic identification.');
        } else if (h1Count > 1) {
            score -= 5;
            issues.push('Multiple H1 tags found - confuses hierarchical structure.');
        }

        // Structure check
        if (h2Count < 2) {
            score -= 5;
            issues.push('Low structural depth (few H2s) - hard for agents to parse sub-topics.');
        }

        // Schema check
        if (schemas.length > 0) {
            score += 15;
        } else {
            score -= 10;
            issues.push('No Schema.org markup found - crucial for structured data extraction by AI.');
        }

        // Content depth
        if (wordCount < 300) {
            score -= 10;
            issues.push('Thin content (<300 words) - minimal context for LLMs.');
        } else if (wordCount > 1000) {
            score += 5;
        }

        // Q&A Bonus
        if (qnaCount > 2) {
            score += 10;
        } else {
            issues.push('Few direct Q&A pairs detected - consider adding an FAQ section for Featured Snippets/Direct Answers.');
        }

        // Cap score
        score = Math.min(100, Math.max(0, score));

        // Generate summary
        let summary = "Good foundation, but needs optimization.";
        if (score > 90) summary = "Excellent agent-ready structure!";
        else if (score < 50) summary = "Requires significant restructuring for AI visibility.";

        return {
            url,
            score,
            readability: {
                score: Math.round(score), // simplified for now
                issues,
            },
            structure: {
                h1Count,
                h2Count,
                h3Count,
                hasSchema: schemas.length > 0,
                schemaTypes: schemas,
                metaDescription: !!metaDescription,
            },
            content: {
                wordCount,
                qnaCount,
            },
            summary,
        };

    } catch (error) {
        console.error("Audit failed:", error);
        throw error;
    }
}
