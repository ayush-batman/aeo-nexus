import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export type LLMPlatform = 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'google_ai' | 'bing_copilot';

export interface ScanResult {
    platform: LLMPlatform;
    prompt: string;
    response: string;
    brandMentioned: boolean;
    mentionPosition: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    competitorsMentioned: string[];
    citations: { url: string; title: string; isOwnDomain: boolean }[];
    timestamp: string;
}

export interface ScanOptions {
    prompt: string;
    brandName: string;
    brandDomain?: string;
    competitors?: string[];
    platforms?: LLMPlatform[];
}

// Analyze response for brand mentions and sentiment
function analyzeResponse(
    response: string,
    brandName: string,
    competitors: string[] = [],
    brandDomain?: string
): Pick<ScanResult, 'brandMentioned' | 'mentionPosition' | 'sentiment' | 'competitorsMentioned'> {
    const lowerResponse = response.toLowerCase();
    const lowerBrand = brandName.toLowerCase();

    // Check brand mention
    const brandMentioned = lowerResponse.includes(lowerBrand);

    // Find position (1 = first mention, 2 = second, etc.)
    let mentionPosition: number | null = null;
    if (brandMentioned) {
        // Split by common separators to find position in list
        const listPatterns = /(?:\d+\.\s+|\*\s+|-\s+|•\s+)/g;
        const items = response.split(listPatterns).filter(Boolean);
        for (let i = 0; i < items.length; i++) {
            if (items[i].toLowerCase().includes(lowerBrand)) {
                mentionPosition = i + 1;
                break;
            }
        }
        // If not in a list, just mark as position 1
        if (mentionPosition === null) mentionPosition = 1;
    }

    // Simple sentiment analysis based on context around brand mention
    let sentiment: 'positive' | 'neutral' | 'negative' | null = null;
    if (brandMentioned) {
        const positiveWords = ['best', 'excellent', 'great', 'recommended', 'top', 'quality', 'reliable', 'popular', 'favorite', 'trusted'];
        const negativeWords = ['avoid', 'poor', 'bad', 'issue', 'problem', 'complaint', 'expensive', 'overpriced', 'disappointing'];

        // Get context around brand mention
        const brandIndex = lowerResponse.indexOf(lowerBrand);
        const contextStart = Math.max(0, brandIndex - 100);
        const contextEnd = Math.min(response.length, brandIndex + brandName.length + 100);
        const context = lowerResponse.slice(contextStart, contextEnd);

        const hasPositive = positiveWords.some(word => context.includes(word));
        const hasNegative = negativeWords.some(word => context.includes(word));

        if (hasPositive && !hasNegative) sentiment = 'positive';
        else if (hasNegative && !hasPositive) sentiment = 'negative';
        else sentiment = 'neutral';
    }

    // Check competitor mentions
    const competitorsMentioned = competitors.filter(comp =>
        lowerResponse.includes(comp.toLowerCase())
    );

    return { brandMentioned, mentionPosition, sentiment, competitorsMentioned };
}

// Extract citations from response (URLs)
function extractCitations(response: string, brandDomain?: string): ScanResult['citations'] {
    const urlPattern = /https?:\/\/[^\s)>\]]+/g;
    const urls = response.match(urlPattern) || [];

    return urls.map(url => {
        const domain = new URL(url).hostname;
        return {
            url,
            title: domain,
            isOwnDomain: brandDomain ? domain.includes(brandDomain) : false,
        };
    });
}

// Scan with Gemini
async function scanWithGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    return result.response.text();
}

// Scan with OpenAI (ChatGPT)
async function scanWithOpenAI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
    });

    return completion.choices[0]?.message?.content || '';
}

// Main scan function
export async function scanLLM(options: ScanOptions): Promise<ScanResult[]> {
    const { prompt, brandName, brandDomain, competitors = [], platforms = ['gemini'] } = options;
    const results: ScanResult[] = [];

    for (const platform of platforms) {
        try {
            let response = '';

            switch (platform) {
                case 'gemini':
                    response = await scanWithGemini(prompt);
                    break;
                case 'chatgpt':
                    response = await scanWithOpenAI(prompt);
                    break;
                // Other platforms would require web scraping or their APIs
                default:
                    console.log(`Platform ${platform} not yet implemented`);
                    continue;
            }

            const analysis = analyzeResponse(response, brandName, competitors, brandDomain);
            const citations = extractCitations(response, brandDomain);

            results.push({
                platform,
                prompt,
                response,
                ...analysis,
                citations,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`Error scanning ${platform}:`, error);
        }
    }

    return results;
}

// Calculate visibility score from scan results
export function calculateVisibilityScore(results: ScanResult[]): number {
    if (results.length === 0) return 0;

    let score = 0;

    for (const result of results) {
        // Base score for being mentioned
        if (result.brandMentioned) {
            score += 40;

            // Position bonus (higher position = better)
            if (result.mentionPosition) {
                if (result.mentionPosition === 1) score += 30;
                else if (result.mentionPosition === 2) score += 20;
                else if (result.mentionPosition <= 5) score += 10;
            }

            // Sentiment bonus
            if (result.sentiment === 'positive') score += 20;
            else if (result.sentiment === 'neutral') score += 10;

            // Own domain citation bonus
            if (result.citations.some(c => c.isOwnDomain)) score += 10;
        }
    }

    // Average across platforms and cap at 100
    return Math.min(100, Math.round(score / results.length));
}
