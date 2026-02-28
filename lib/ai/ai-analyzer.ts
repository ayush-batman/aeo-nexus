import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AnalysisResult {
    brandMentioned: boolean;
    brandVariants: string[];  // All variations found (e.g., "Dylect", "DYLECT", "dylect.com")
    mentionPosition: number | null;
    sentiment: 'positive' | 'neutral' | 'negative';
    sentimentScore: number;  // -1 to 1
    sentimentReason: string;
    competitorPositions: { name: string; position: number | null; sentiment: string }[];
    listItems: string[];  // Parsed list items for position accuracy
    confidence: number;  // 0 to 1
}

interface AIAnalysisInput {
    response: string;
    brandName: string;
    competitors?: string[];
    brandDomain?: string;
}

/**
 * Generate brand name variations for fuzzy matching
 */
export function generateBrandVariants(brandName: string, brandDomain?: string): string[] {
    const variants = new Set<string>();

    // Original
    variants.add(brandName);
    variants.add(brandName.toLowerCase());
    variants.add(brandName.toUpperCase());

    // CamelCase variations
    variants.add(brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase());

    // With/without spaces
    const noSpaces = brandName.replace(/\s+/g, '');
    variants.add(noSpaces);
    variants.add(noSpaces.toLowerCase());

    // Domain variations
    if (brandDomain) {
        variants.add(brandDomain);
        variants.add(brandDomain.replace('www.', ''));
        variants.add(brandDomain.replace('.com', '').replace('.in', '').replace('.co', ''));
    }

    // Common misspellings (single character variations)
    const common = brandName.toLowerCase();
    for (let i = 0; i < common.length; i++) {
        // Missing character
        variants.add(common.slice(0, i) + common.slice(i + 1));
    }

    return Array.from(variants);
}

/**
 * Find all brand mentions with fuzzy matching
 */
export function findBrandMentions(
    response: string,
    brandName: string,
    brandDomain?: string
): { found: boolean; variants: string[]; positions: number[] } {
    const variants = generateBrandVariants(brandName, brandDomain);
    const lowerResponse = response.toLowerCase();
    const foundVariants: string[] = [];
    const positions: number[] = [];

    for (const variant of variants) {
        const lowerVariant = variant.toLowerCase();
        let index = lowerResponse.indexOf(lowerVariant);
        while (index !== -1) {
            if (!foundVariants.includes(variant)) {
                foundVariants.push(variant);
            }
            positions.push(index);
            index = lowerResponse.indexOf(lowerVariant, index + 1);
        }
    }

    return {
        found: foundVariants.length > 0,
        variants: foundVariants,
        positions: positions.sort((a, b) => a - b),
    };
}

/**
 * Parse numbered/bulleted lists from response
 */
export function parseListItems(response: string): string[] {
    const items: string[] = [];

    // Match numbered lists: "1.", "1)", "1:"
    const numberedPattern = /(?:^|\n)\s*(\d+)[.):]\s*(.+?)(?=\n\s*\d+[.):]\s*|\n\n|$)/gs;
    let match;
    while ((match = numberedPattern.exec(response)) !== null) {
        items.push(match[2].trim());
    }

    // Match bullet lists: "•", "-", "*"
    if (items.length === 0) {
        const bulletPattern = /(?:^|\n)\s*[•\-\*]\s*(.+?)(?=\n\s*[•\-\*]\s*|\n\n|$)/gs;
        while ((match = bulletPattern.exec(response)) !== null) {
            items.push(match[1].trim());
        }
    }

    // Match markdown headers as sections
    if (items.length === 0) {
        const headerPattern = /(?:^|\n)#{1,3}\s*(.+?)(?=\n|$)/gs;
        while ((match = headerPattern.exec(response)) !== null) {
            items.push(match[1].trim());
        }
    }

    return items;
}

/**
 * Find position of brand in a ranked list
 */
export function findListPosition(
    response: string,
    brandName: string,
    brandDomain?: string
): number | null {
    const items = parseListItems(response);
    if (items.length === 0) return null;

    const variants = generateBrandVariants(brandName, brandDomain);

    for (let i = 0; i < items.length; i++) {
        const lowerItem = items[i].toLowerCase();
        for (const variant of variants) {
            if (lowerItem.includes(variant.toLowerCase())) {
                return i + 1; // 1-indexed position
            }
        }
    }

    return null;
}

/**
 * Use AI to analyze sentiment with context
 */
export async function analyzeWithAI(input: AIAnalysisInput): Promise<AnalysisResult> {
    const { response, brandName, competitors = [], brandDomain } = input;

    // First, do local analysis
    const mentions = findBrandMentions(response, brandName, brandDomain);
    const listItems = parseListItems(response);
    const listPosition = findListPosition(response, brandName, brandDomain);

    // Find competitor positions
    const competitorPositions = competitors.map(comp => {
        const compMentions = findBrandMentions(response, comp);
        const compPosition = findListPosition(response, comp);
        return {
            name: comp,
            position: compPosition,
            sentiment: 'neutral', // Will be updated by AI
        };
    });

    // If brand not mentioned, return early
    if (!mentions.found) {
        return {
            brandMentioned: false,
            brandVariants: [],
            mentionPosition: null,
            sentiment: 'neutral',
            sentimentScore: 0,
            sentimentReason: 'Brand not mentioned in response',
            competitorPositions,
            listItems,
            confidence: 0.9,
        };
    }

    // Use AI for deeper sentiment analysis
    const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!geminiKey && !anthropicKey) {
        // Fallback to simple sentiment analysis
        return fallbackSentimentAnalysis(response, brandName, mentions, listPosition, competitorPositions, listItems);
    }

    const analysisPrompt = `Analyze the sentiment toward "${brandName}" in this text. Return JSON only.

Text:
"""
${response.slice(0, 2000)}
"""

Return this exact JSON structure:
{
  "isKnownEntity": boolean, // true ONLY if the text discusses this brand as a real, known entity. false if the text says it doesn't know it, couldn't find it, hallucinates, or it doesn't exist.
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number between -1 (very negative) and 1 (very positive),
  "reason": "brief explanation of why this sentiment",
  "confidence": number between 0 and 1
}`;

    // Try Gemini first
    if (geminiKey) {
        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const result = await model.generateContent(analysisPrompt);
            const text = result.response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const isRealMention = parsed.isKnownEntity !== false && mentions.found;
                return {
                    brandMentioned: isRealMention,
                    brandVariants: mentions.variants,
                    mentionPosition: isRealMention ? listPosition : null,
                    sentiment: isRealMention ? (parsed.sentiment || 'neutral') : 'neutral',
                    sentimentScore: isRealMention ? (parsed.sentimentScore || 0) : 0,
                    sentimentReason: isRealMention ? (parsed.reason || 'AI analysis complete') : 'Brand is not recognized as a real entity in this response.',
                    competitorPositions,
                    listItems,
                    confidence: parsed.confidence || 0.8,
                };
            }
        } catch (error) {
            console.warn('Gemini analysis failed, trying Claude fallback:', error instanceof Error ? error.message : error);
        }
    }

    // Fallback to Claude via direct API call (no SDK needed)
    if (anthropicKey) {
        try {
            const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 256,
                    messages: [{ role: 'user', content: analysisPrompt }],
                }),
            });

            if (claudeRes.ok) {
                const data = await claudeRes.json();
                const text = data.content?.[0]?.text || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const isRealMention = parsed.isKnownEntity !== false && mentions.found;
                    return {
                        brandMentioned: isRealMention,
                        brandVariants: mentions.variants,
                        mentionPosition: isRealMention ? listPosition : null,
                        sentiment: isRealMention ? (parsed.sentiment || 'neutral') : 'neutral',
                        sentimentScore: isRealMention ? (parsed.sentimentScore || 0) : 0,
                        sentimentReason: isRealMention ? (parsed.reason || 'AI analysis (Claude)') : 'Brand is not recognized as a real entity in this response.',
                        competitorPositions,
                        listItems,
                        confidence: parsed.confidence || 0.8,
                    };
                }
            } else {
                console.warn('Claude API returned non-OK:', claudeRes.status);
            }
        } catch (error) {
            console.error('Claude analysis also failed:', error);
        }
    }

    // Fallback if all AI fails
    return fallbackSentimentAnalysis(response, brandName, mentions, listPosition, competitorPositions, listItems);
}

/**
 * Fallback sentiment analysis using keyword matching
 */
function fallbackSentimentAnalysis(
    response: string,
    brandName: string,
    mentions: { found: boolean; variants: string[]; positions: number[] },
    listPosition: number | null,
    competitorPositions: { name: string; position: number | null; sentiment: string }[],
    listItems: string[]
): AnalysisResult {
    const lowerResponse = response.toLowerCase();
    const lowerBrand = brandName.toLowerCase();

    const positiveWords = [
        'best', 'excellent', 'great', 'recommended', 'top', 'quality',
        'reliable', 'popular', 'favorite', 'trusted', 'premium', 'amazing',
        'outstanding', 'highly rated', 'top-rated', 'leading', 'loved'
    ];
    const negativeWords = [
        'avoid', 'poor', 'bad', 'issue', 'problem', 'complaint',
        'expensive', 'overpriced', 'disappointing', 'worst', 'terrible',
        'not recommended', 'low quality', 'cheap', 'unreliable'
    ];

    // Get context around brand mention
    const brandIndex = lowerResponse.indexOf(lowerBrand);
    const contextStart = Math.max(0, brandIndex - 150);
    const contextEnd = Math.min(response.length, brandIndex + brandName.length + 150);
    const context = lowerResponse.slice(contextStart, contextEnd);

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
        if (context.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
        if (context.includes(word)) negativeCount++;
    });

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let sentimentScore = 0;
    let sentimentReason = 'Neutral context around brand mention';

    if (positiveCount > negativeCount + 1) {
        sentiment = 'positive';
        sentimentScore = Math.min(1, positiveCount * 0.2);
        sentimentReason = `Found ${positiveCount} positive indicators`;
    } else if (negativeCount > positiveCount + 1) {
        sentiment = 'negative';
        sentimentScore = -Math.min(1, negativeCount * 0.2);
        sentimentReason = `Found ${negativeCount} negative indicators`;
    }

    // Position boost for positive sentiment
    if (listPosition === 1) {
        sentiment = 'positive';
        sentimentScore = Math.max(sentimentScore, 0.5);
        sentimentReason = 'Brand listed first in recommendations';
    }

    return {
        brandMentioned: mentions.found,
        brandVariants: mentions.variants,
        mentionPosition: listPosition,
        sentiment,
        sentimentScore,
        sentimentReason,
        competitorPositions,
        listItems,
        confidence: 0.6, // Lower confidence for keyword-based analysis
    };
}
