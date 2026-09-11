import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'node:crypto';
import { analyzeWithAI, findBrandMentions } from './ai-analyzer';
import {
    anthropicUsedWebSearch,
    collectCitationEvidence,
    extractAnthropicCitationReferences,
    extractGeminiCitationReferences,
    extractOpenAICitationReferences,
    extractPerplexityCitationReferences,
    geminiUsedWebSearch,
    openAIUsedWebSearch,
    resolveGeminiCitationReferences,
} from './citation-provenance';
import {
    assertAzureResponsesApiVersion,
    DEFAULT_AZURE_OPENAI_API_VERSION,
    getOpenAIClient,
    isOpenAIProviderAvailable,
    openAIProviderName,
} from './openai-client';
import type { CitationEvidence } from '../types';
import { MEASUREMENT_CONTRACT_VERSION, MEASUREMENT_SCORER_VERSION } from '../measurement/types';

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
    // Legacy keys remain on CitationEvidence for existing JSONB/API consumers.
    citations: CitationEvidence[];
    sampleId: string;
    listItems: string[];
    confidence: number;
    timestamp: string;
    providerModel?: string;
    measurementRegion?: string;
    measurementMode?: 'standard' | 'battle';
    scorerVersion?: string;
    measurementContractVersion?: string;
    measurementRunId?: string;
    sampleNumber?: number;
    searchMode?: string;
    analyzerMethod?: string;
    analyzerModel?: string;
    analyzerPromptVersion?: string;
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

interface ProviderScanResponse {
    text: string;
    providerCitations: unknown[];
    providerModel: string;
    searchMode: string;
}

const PROVIDER_TIMEOUT_MS = 20_000;
const OPENAI_PROVIDER_TIMEOUT_MS = 30_000;
const MAX_ENGINE_CONCURRENCY = 4;

function providerSignal(timeoutMs = PROVIDER_TIMEOUT_MS): AbortSignal {
    return AbortSignal.timeout(timeoutMs);
}

// Scan with Gemini
async function scanWithGemini(prompt: string): Promise<ProviderScanResponse> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('provider_not_configured');
    const client = new GoogleGenAI({ apiKey });
    const providerModel = process.env.AELO_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const result = await client.models.generateContent({ model: providerModel, contents: prompt,
        config: { tools: [{ googleSearch: {} }], httpOptions: { timeout: PROVIDER_TIMEOUT_MS }, abortSignal: providerSignal() } });
    const providerCitations = await resolveGeminiCitationReferences(extractGeminiCitationReferences(result));
    return { text: result.text || '', providerCitations,
        providerModel: result.modelVersion || providerModel,
        searchMode: geminiUsedWebSearch(result) ? 'google_search' : 'model_only' };
}

async function scanWithOpenAI(prompt: string): Promise<ProviderScanResponse> {
    if (openAIProviderName() === 'azure') {
        assertAzureResponsesApiVersion(
            process.env.AZURE_OPENAI_API_VERSION ?? DEFAULT_AZURE_OPENAI_API_VERSION,
        );
    }
    const { client, model } = getOpenAIClient('default');
    const providerModel = process.env.AELO_OPENAI_MODEL?.trim() || model;
    const result = await client.responses.create({ model: providerModel, input: prompt,
        tools: [{ type: 'web_search', search_context_size: 'low' }],
        ...(providerModel.startsWith('gpt-5') ? { reasoning: { effort: 'low' as const } } : {}),
        max_output_tokens: 2000 },
        { signal: providerSignal(OPENAI_PROVIDER_TIMEOUT_MS), timeout: OPENAI_PROVIDER_TIMEOUT_MS, maxRetries: 0 });
    if (result.status !== 'completed') throw new Error('provider_incomplete_response');
    return { text: result.output_text || '', providerCitations: extractOpenAICitationReferences(result),
        providerModel: result.model || providerModel,
        searchMode: openAIUsedWebSearch(result) ? 'web_search' : 'model_only' };
}

async function scanWithClaude(prompt: string): Promise<ProviderScanResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('provider_not_configured');
    const providerModel = process.env.AELO_CLAUDE_MODEL?.trim() || 'claude-sonnet-4-6';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: providerModel, max_tokens: 4096,
            tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
            messages: [{ role: 'user', content: prompt }] }), signal: providerSignal(),
    });
    if (!response.ok) throw new Error(`provider_http_${response.status}`);
    const data = await response.json() as { model?: string; stop_reason?: string; content?: Array<{ type?: string; text?: string; content?: unknown }> };
    if (data.stop_reason !== 'end_turn') throw new Error('provider_incomplete_response');
    if (data.content?.some((block) => block.type === 'web_search_tool_result' &&
        block.content && typeof block.content === 'object' && 'type' in block.content &&
        block.content.type === 'web_search_tool_result_error')) throw new Error('provider_search_failed');
    return { text: data.content?.filter((block) => block.type === 'text').map((block) => block.text || '').join('\n') || '',
        providerCitations: extractAnthropicCitationReferences(data), providerModel: data.model || providerModel,
        searchMode: anthropicUsedWebSearch(data) ? 'web_search_20250305' : 'model_only' };
}

async function scanWithPerplexity(prompt: string): Promise<ProviderScanResponse> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error('provider_not_configured');
    const providerModel = process.env.AELO_PERPLEXITY_MODEL?.trim() || 'sonar';
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: providerModel, messages: [{ role: 'user', content: prompt }] }),
        signal: providerSignal(),
    });
    if (!response.ok) throw new Error(`provider_http_${response.status}`);
    const data = await response.json() as { model?: string; choices?: Array<{ message?: { content?: string }; finish_reason?: string }>; citations?: unknown[]; search_results?: unknown[] };
    if (data.choices?.[0]?.finish_reason !== 'stop') throw new Error('provider_incomplete_response');
    return { text: data.choices?.[0]?.message?.content || '', providerCitations: extractPerplexityCitationReferences(data),
        providerModel: data.model || providerModel, searchMode: 'sonar_search' };
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

    const requestedPlatforms = [...new Set(platforms)];
    for (let offset = 0; offset < requestedPlatforms.length; offset += MAX_ENGINE_CONCURRENCY) {
        const batch = requestedPlatforms.slice(offset, offset + MAX_ENGINE_CONCURRENCY);
        await Promise.all(batch.map(async (platform) => {
          try {
            let providerResult: ProviderScanResponse;

            switch (platform) {
                case 'gemini':
                    providerResult = await scanWithGemini(prompt);
                    break;
                case 'chatgpt':
                    providerResult = await scanWithOpenAI(prompt);
                    break;
                case 'claude':
                    providerResult = await scanWithClaude(prompt);
                    break;
                case 'perplexity':
                    providerResult = await scanWithPerplexity(prompt);
                    break;
                case 'google_ai':
                case 'google_ai_overview':
                case 'mock':
                default:
                    throw new Error('unsupported_engine: No real measurement adapter is configured for this engine.');
            }
            const response = providerResult.text;
            if (!response.trim()) throw new Error('provider_empty_response');
            const sampleId = randomUUID();

            // Use AI-powered analysis
            const analysis = await analyzeWithAI({
                response,
                brandName,
                competitors,
                brandDomain,
            });

            const citations = collectCitationEvidence({
                text: response,
                providerCitations: providerResult.providerCitations,
                provider: platform,
                sampleId,
                brandDomain,
            });

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
                    .filter(c => findBrandMentions(response, c.name).found)
                    .map(c => c.name),
                competitorPositions: analysis.competitorPositions,
                citations,
                sampleId,
                listItems: analysis.listItems,
                confidence: analysis.confidence,
                timestamp: new Date().toISOString(),
                providerModel: providerResult.providerModel,
                searchMode: providerResult.searchMode,
                analyzerMethod: analysis.analyzerMethod,
                analyzerModel: analysis.analyzerModel,
                analyzerPromptVersion: analysis.analyzerPromptVersion,
                measurementRegion: process.env.AELO_MEASUREMENT_REGION?.trim() || 'global-unspecified',
                measurementMode: mode,
                scorerVersion: MEASUREMENT_SCORER_VERSION,
                measurementContractVersion: MEASUREMENT_CONTRACT_VERSION,
            };

            if (mode === 'battle') {
                let winner = null;
                let winnerReason = "No clear winner detected in the response.";

                const bestCompetitor = scanResult.competitorPositions[0];
                const compName = bestCompetitor?.name || '';
                
                // 1. Check lists
                let myPos = scanResult.mentionPosition || 999;
                let compPos = bestCompetitor?.position || 999;

                // 2. If lists didn't work (both 999), check raw text index
                if (myPos === 999 && compPos === 999 && compName) {
                    const myIndex = findBrandMentions(response, brandName, brandDomain).positions[0] ?? -1;
                    const compIndex = findBrandMentions(response, compName).positions[0] ?? -1;
                    
                    if (myIndex !== -1) myPos = myIndex;
                    if (compIndex !== -1) compPos = compIndex;
                }

                if (myPos !== 999 && compPos === 999) {
                    winner = brandName;
                    winnerReason = `${brandName} was mentioned, but ${compName} was ignored entirely.`;
                } else if (compPos !== 999 && myPos === 999) {
                    winner = compName;
                    winnerReason = `${compName} was mentioned, but ${brandName} was ignored entirely.`;
                } else if (myPos !== 999 && compPos !== 999 && myPos !== compPos) {
                    if (myPos < compPos) {
                        winner = brandName;
                        winnerReason = `${brandName} was prioritized earlier in the response.`;
                    } else {
                        winner = compName;
                        winnerReason = `${compName} was prioritized earlier in the response.`;
                    }
                } else if (myPos !== 999 && compPos !== 999 && myPos === compPos) {
                    // Tie break by sentiment
                    if (scanResult.sentimentScore > 0.2) {
                        winner = brandName;
                        winnerReason = `${brandName} was favored slightly in sentiment.`;
                    } else if (scanResult.sentimentScore < -0.2) {
                        winner = compName;
                        winnerReason = `${compName} received more positive sentiment.`;
                    }
                } else {
                    winnerReason = `Neither brand was mentioned by the AI.`;
                }

                (scanResult as BattleResult).winner = winner;
                (scanResult as BattleResult).winnerReason = winnerReason;
            }

            results.push(scanResult);
          } catch (error) {
            const message = error instanceof Error ? error.message : '';
            const errMsg = /^(provider_|unsupported_engine)/.test(message) ? message :
                error instanceof Error && /timeout|abort/i.test(error.name + message) ? 'provider_timeout' : 'provider_request_failed';
            errors.push({ platform, error: errMsg });
          }
        }));
    }

    // HONEST DATA POLICY: if every requested platform failed, we return empty
    // results with the real errors intact. We do NOT fabricate a "mock" scan and
    // pass it off as real, an analytics product must never show an invented number.
    // Callers are responsible for surfacing an honest "provider unavailable" state.
    if (results.length === 0 && platforms.length > 0) {
        console.error('[scanLLM] All requested platforms failed:', errors.map(e => `${e.platform}: ${e.error}`).join('; '));
    }

    return { results, errors };
}

// Calculate visibility score from scan results
export function calculateVisibilityScore(results: ScanResult[]): number | null {
    if (results.length === 0) return null;
    const mentions = results.filter((result) => result.brandMentioned).length;
    return Math.round((mentions / results.length) * 100);
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
            available: isOpenAIProviderAvailable(),
            reason: !isOpenAIProviderAvailable() ? 'No OpenAI provider configured (Azure OpenAI or direct OpenAI)' : undefined,
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
            available: false,
            reason: 'No real Google AI Overview adapter is configured. Gemini results are not Google Search results.',
        },
        {
            platform: 'mock',
            available: false, // Disabled for production
        },
    ];
}
