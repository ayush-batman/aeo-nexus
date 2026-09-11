
import { GoogleGenerativeAI } from '@google/generative-ai';


interface DiscoveredSources {
    subreddits: string[];
    youtubeKeywords: string[];
    otherForums: string[];
}

/**
 * Discover relevant forums and content sources based on industry and audience.
 * Uses Gemini to brainstorm high-relevance communities.
 */
export async function discoverIndustrySources(
    industry: string,
    targetAudience: string,
    productName?: string
): Promise<DiscoveredSources> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('source_discovery_not_configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_DISCOVERY_MODEL || 'gemini-2.5-flash' });
    const currentYear = new Date().getFullYear();

    const prompt = `
    You are a marketing strategist in the year ${currentYear}. Identify the best online communities and content sources for a brand in the following niche:
    
    Industry: ${industry}
    Target Audience: ${targetAudience}
    ${productName ? `Product Name: ${productName}` : ''}

    Return a valid JSON object with the following arrays:
    1. "subreddits": List of 5-10 specific, high-relevance subreddit names (without 'r/', e.g., "marketing", "startups"). Focus on where the audience hangs out.
    2. "youtubeKeywords": List of 5-10 specific search terms to find influential videos and channels (e.g., "fashion trends 2025", "best streetwear brands").
    3. "otherForums": List of 3-5 specific non-Reddit forums or communities (e.g., "IndieHackers", "StyleForum").

    Make sure the JSON is valid and only return the JSON.
    `;

    try {
        const result = await model.generateContent(prompt, { timeout: 60000 });
        const response = result.response;
        const text = response.text().replace(/```json|```/g, '').trim();

        const sources: unknown = JSON.parse(text);
        if (!sources || typeof sources !== 'object' || Array.isArray(sources)) throw new Error('invalid_discovery_result');
        const read = (key: string) => {
            const value = (sources as Record<string, unknown>)[key];
            if (!Array.isArray(value) || value.length > 20 || value.some(item => typeof item !== 'string' || item.length > 200)) throw new Error('invalid_discovery_result');
            return value as string[];
        };
        return { subreddits: read('subreddits'), youtubeKeywords: read('youtubeKeywords'), otherForums: read('otherForums') };
    } catch (error) {
        throw new Error('source_discovery_failed', { cause: error });
    }
}
