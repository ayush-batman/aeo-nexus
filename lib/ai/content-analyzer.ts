import * as cheerio from 'cheerio';
import { safeFetchText } from '../security/safe-fetch';

export interface AuditResult {
    evidenceStatus: 'heuristic_page_check';
    url: string;
    score: number;
    readability: {
        score: null;
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
        const response = await safeFetchText(url, {
            headers: {
                'User-Agent': 'AEO-Nexus-Bot/1.0',
            },
            timeoutMs: 10_000,
            maxBytes: 1_000_000,
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
        }

        const html = response.text;
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
            } catch {
                // Ignore invalid JSON
            }
        });

        // 3. Content Analysis
        // Remove scripts, styles, etc.
        $('script, style, noscript, svg, iframe').remove();
        const cleanText = $('body').text().replace(/\s+/g, ' ').trim();
        const wordCount = cleanText ? cleanText.split(' ').length : 0;

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

        // Core SEO tags
        if ($('title').length === 0) {
            score -= 10;
            issues.push('No title element found in the fetched HTML.');
        }

        if (!metaDescription) {
            score -= 10;
            issues.push('No meta description found in the fetched HTML.');
        } else if (metaDescription.length < 50) {
            score -= 5;
            issues.push('Meta description is shorter than this checklist’s 50-character threshold.');
        }

        // H1 check
        if (h1Count === 0) {
            score -= 10;
            issues.push('No H1 heading found; check whether the main topic is clear.');
        } else if (h1Count > 1) {
            score -= 5;
            issues.push('Multiple H1 headings found; review their hierarchy in context.');
        }

        // Structure check
        if (h2Count < 2) {
            score -= 5;
            issues.push('Fewer than two H2 headings found; short pages may not need more.');
        }

        // Layout semantics
        if ($('main, article').length === 0) {
            score -= 5;
            issues.push('No main or article landmark found in the fetched HTML.');
        }

        // Image context
        let missingAltCount = 0;
        $('img').each((_, el) => {
            const alt = $(el).attr('alt');
            if (alt === undefined) {
                missingAltCount++;
            }
        });
        if (missingAltCount > 0) {
            const penalty = Math.min(15, missingAltCount * 2); // Max -15 penalty
            score -= penalty;
            issues.push(`${missingAltCount} images lack an alt attribute. Add useful text for meaningful images; use an empty alt attribute for decorative images.`);
        }

        // Schema check
        if (schemas.length > 0) {
            score += 15;
            if (schemas.length > 2) {
                score += 5; // Bonus for rich schema
            }
        } else {
            score -= 10;
            issues.push('No top-level JSON-LD type found; nested markup may require manual review.');
        }

        // Content depth
        if (wordCount < 300) {
            score -= 15;
            issues.push('Fewer than 300 visible words found. Length alone does not determine usefulness.');
        } else if (wordCount > 1500) {
            score += 10; // Extra bonus for deep content
        } else if (wordCount > 800) {
            score += 5;
        }

        // Q&A Bonus
        if (qnaCount > 2) {
            score += 10;
        } else {
            issues.push('Few question-and-answer patterns detected. Add answers only where useful to readers.');
        }

        // Cap score
        score = Math.min(100, Math.max(0, score));

        // Generate summary
        const summary = 'Rule-based HTML checklist, not a readability test or AI-visibility measurement. Weights are editorial, not calibrated against assistant answers; inspect each finding in context.';

        return {
            evidenceStatus: 'heuristic_page_check',
            url,
            score,
            readability: {
                score: null, // No readability test was performed.
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
