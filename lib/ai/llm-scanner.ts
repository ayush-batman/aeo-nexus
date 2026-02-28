import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { analyzeWithAI, findBrandMentions, findListPosition, parseListItems } from './ai-analyzer';

export type LLMPlatform = 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'google_ai' | 'google_ai_overview' | 'bing_copilot' | 'mock';

export interface ScanResult {
    platform: LLMPlatform;
    prompt: string;
    response: string;
    brandMentioned: boolean;
    brandVariants: string[];
    mentionPosition: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    sentimentScore: number;
    sentimentReason: string;
    competitorsMentioned: string[];
    competitorPositions: { name: string; position: number | null; sentiment: string }[];
    citations: { url: string; title: string; isOwnDomain: boolean }[];
    listItems: string[];
    confidence: number;
    timestamp: string;
}

export interface ScanOptions {
    prompt: string;
    brandName: string;
    brandDomain?: string;
    competitors?: string[];
    platforms?: LLMPlatform[];
    mode?: 'standard' | 'battle';
}

export interface BattleResult extends ScanResult {
    winner: string | null;
    winnerReason: string;
}

// Extract citations from response (URLs)
function extractCitations(response: string, brandDomain?: string): ScanResult['citations'] {
    const urlPattern = /https?:\/\/[^\s)>\]]+/g;
    const urls = response.match(urlPattern) || [];

    return urls.map(url => {
        try {
            const domain = new URL(url).hostname;
            return {
                url,
                title: domain,
                isOwnDomain: brandDomain ? domain.includes(brandDomain) : false,
            };
        } catch {
            return {
                url,
                title: url,
                isOwnDomain: false,
            };
        }
    });
}

// Scan with Gemini
async function scanWithGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

// Scan with Claude (Anthropic)
async function scanWithClaude(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // Dynamic import to avoid build issues if not installed
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API Error Details:', errorText);
        throw new Error(`Claude API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
}

// Scan with Perplexity
async function scanWithPerplexity(prompt: string): Promise<string> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// Mock scan for testing/demo
async function scanWithMock(prompt: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return `Here is a comparison based on your request: "${prompt}"

1. **Brand Awareness**: Both brands are well-known, but the competitor seems to have slightly more visibility in recent trends.
2. **Quality**: Your Brand is often cited for durability, whereas the Competitor is praised for style.
3. **Recommendation**: For professional use, Your Brand is recommended. For casual wear, the Competitor might be better.

Overall, it's a close call, but Your Brand edges out in terms of long-term value.

Sources:
- https://example.com/review
- https://forums.reddit.com/r/reviews`;
}

// Scan simulating Google AI Overview
// Uses Gemini with a system prompt that mimics how Google generates AI Overviews
async function scanWithGoogleAIOverview(prompt: string): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `You are simulating a Google AI Overview (the AI-generated summary that appears at the top of Google Search results). 
Respond as if you are Google's AI Overview feature:
- Provide a concise, factual summary answering the search query
- Include specific product/brand names when relevant
- Mention sources with URLs where you found the information
- Use a neutral, authoritative tone similar to Google's AI Overviews
- List 3-5 key points or recommendations
- Include citations like [Source: example.com]

Search query: "${prompt}"

Provide the AI Overview response:`;

    const result = await model.generateContent(systemPrompt);
    return result.response.text();
}

export interface ScanOutput {
    results: (ScanResult | BattleResult)[];
    errors: { platform: LLMPlatform; error: string }[];
}

// Main scan function
export async function scanLLM(options: ScanOptions): Promise<ScanOutput> {
    const { prompt, brandName, brandDomain, competitors = [], platforms = ['gemini'], mode = 'standard' } = options;
    const results: (ScanResult | BattleResult)[] = [];
    const errors: { platform: LLMPlatform; error: string }[] = [];

    for (const platform of platforms) {
        try {
            let response = '';

            switch (platform) {
                case 'gemini':
                case 'google_ai':
                    response = await scanWithGemini(prompt);
                    break;
                case 'chatgpt':
                    response = await scanWithOpenAI(prompt);
                    break;
                case 'claude':
                    response = await scanWithClaude(prompt);
                    break;
                case 'perplexity':
                    response = await scanWithPerplexity(prompt);
                    break;
                case 'google_ai_overview':
                    response = await scanWithGoogleAIOverview(prompt);
                    break;
                case 'mock':
                    response = await scanWithMock(prompt);
                    break;
                default:
                    console.log(`Platform ${platform} not yet implemented`);
                    continue;
            }

            // Use AI-powered analysis
            const analysis = await analyzeWithAI({
                response,
                brandName,
                competitors,
                brandDomain,
            });

            const citations = extractCitations(response, brandDomain);

            const scanResult: ScanResult = {
                platform,
                prompt,
                response,
                brandMentioned: analysis.brandMentioned,
                brandVariants: analysis.brandVariants,
                mentionPosition: analysis.mentionPosition,
                sentiment: analysis.sentiment,
                sentimentScore: analysis.sentimentScore,
                sentimentReason: analysis.sentimentReason,
                competitorsMentioned: analysis.competitorPositions
                    .filter(c => c.position !== null)
                    .map(c => c.name),
                competitorPositions: analysis.competitorPositions,
                citations,
                listItems: analysis.listItems,
                confidence: analysis.confidence,
                timestamp: new Date().toISOString(),
            };

            if (mode === 'battle') {
                // Simple winner determination based on sentiment and position
                // In a real implementation, we might ask the LLM explicitly "Who won?"
                let winner = null;
                let winnerReason = "No clear winner detected.";

                // Check position first
                const myPos = scanResult.mentionPosition || 999;
                const bestCompetitor = scanResult.competitorPositions.sort((a, b) => (a.position || 999) - (b.position || 999))[0];
                const compPos = bestCompetitor?.position || 999;

                if (myPos < compPos) {
                    winner = brandName;
                    winnerReason = `${brandName} appeared first in the response.`;
                } else if (compPos < myPos) {
                    winner = bestCompetitor.name;
                    winnerReason = `${bestCompetitor.name} appeared first in the response.`;
                } else {
                    // Tie-break with sentiment
                    if (scanResult.sentimentScore > 0.5) {
                        winner = brandName;
                        winnerReason = `${brandName} had significantly better sentiment.`;
                    }
                }

                (scanResult as BattleResult).winner = winner;
                (scanResult as BattleResult).winnerReason = winnerReason;
            }

            results.push(scanResult);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error(`Error scanning ${platform}:`, errMsg);
            errors.push({ platform, error: errMsg });
        }
    }

    // If all real platforms failed, log the error — do NOT inject mock/fake data
    if (results.length === 0 && platforms.length > 0) {
        console.error('[scanLLM] All platforms failed. No results returned. Check API keys and network connectivity.');
    }

    return { results, errors };
}

// Calculate visibility score from scan results
export function calculateVisibilityScore(results: ScanResult[]): number {
    if (results.length === 0) return 0;

    let totalScore = 0;

    for (const result of results) {
        let score = 0;

        // Base score for being mentioned
        if (result.brandMentioned) {
            score += 40;

            // Position bonus (higher position = better)
            if (result.mentionPosition) {
                if (result.mentionPosition === 1) score += 30;
                else if (result.mentionPosition === 2) score += 20;
                else if (result.mentionPosition === 3) score += 15;
                else if (result.mentionPosition <= 5) score += 10;
                else if (result.mentionPosition <= 10) score += 5;
            }

            // Sentiment bonus (using score for more granularity)
            if (result.sentimentScore > 0.5) score += 20;
            else if (result.sentimentScore > 0) score += 10;
            else if (result.sentimentScore < -0.5) score -= 10;

            // Own domain citation bonus
            if (result.citations.some(c => c.isOwnDomain)) score += 10;

            // Confidence adjustment
            score = Math.round(score * result.confidence);
        }

        totalScore += score;
    }

    // Average across platforms and cap at 100
    return Math.min(100, Math.round(totalScore / results.length));
}

// Get available platforms (those with configured API keys)
export function getAvailablePlatforms(): { platform: LLMPlatform; available: boolean; reason?: string }[] {
    return [
        {
            platform: 'gemini',
            available: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
            reason: !(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) ? 'GOOGLE_API_KEY not set' : undefined,
        },
        {
            platform: 'chatgpt',
            available: !!process.env.OPENAI_API_KEY,
            reason: !process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY not set' : undefined,
        },
        {
            platform: 'claude',
            available: !!process.env.ANTHROPIC_API_KEY,
            reason: !process.env.ANTHROPIC_API_KEY ? 'ANTHROPIC_API_KEY not set' : undefined,
        },
        {
            platform: 'perplexity',
            available: !!process.env.PERPLEXITY_API_KEY,
            reason: !process.env.PERPLEXITY_API_KEY ? 'PERPLEXITY_API_KEY not set' : undefined,
        },
        {
            platform: 'google_ai_overview',
            available: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
            reason: !(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) ? 'GOOGLE_API_KEY not set (required for AI Overview)' : undefined,
        },
        {
            platform: 'mock',
            available: false, // Disabled for production
        },
    ];
}

// Generate prompts for research
export async function generatePrompts(
    topic: string,
    brandName: string
): Promise<{ category: string; prompt: string }[]> {
    const prompt = `You are an AEO (Answer Engine Optimization) expert.
    Generate 30 high-value search queries (prompts) that potential customers would ask an AI assistant (like ChatGPT, Gemini, Perplexity) when researching "${topic}" or "${brandName}".
    
    Categorize them into the following buyer journey stages:
    - Awareness (Problem aware)
    - Consideration (Solution searching)
    - Comparison (Comparing options)
    - Decision (Ready to buy)
    - Commercial (Pricing, features)

    Return ONLY a valid JSON array of objects with "category" and "prompt" keys. Do not include markdown code blocks.
    Example: [{"category": "Awareness", "prompt": "Best tools for..."}]`;

    try {
        // Try Gemini first as it's fast and good with instructions
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            return JSON.parse(text);
        }

        // Fallback to OpenAI if Gemini not available
        const openAiKey = process.env.OPENAI_API_KEY;
        if (openAiKey) {
            const openai = new OpenAI({ apiKey: openAiKey });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            });
            const content = completion.choices[0]?.message?.content || '{"prompts": []}';
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : (parsed.prompts || []);
        }

        throw new Error('No AI provider configured for prompt generation');
    } catch (error) {
        console.error('Error generating prompts:', error);
        // Fallback mock data
        return [
            { category: 'Awareness', prompt: `What is the best ${topic} for small business?` },
            { category: 'Consideration', prompt: `Top rated ${topic} tools 2024` },
            { category: 'Comparison', prompt: `${brandName} vs competitors` },
            { category: 'Decision', prompt: `${brandName} pricing and features` },
            { category: 'Commercial', prompt: `Buy ${brandName} subscription` }
        ];
    }
}
