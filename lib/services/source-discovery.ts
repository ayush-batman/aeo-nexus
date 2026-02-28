
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
        console.warn('GEMINI_API_KEY not set for source discovery.');
        return { subreddits: [], youtubeKeywords: [], otherForums: [] };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().replace(/```json|```/g, '').trim();

        const sources = JSON.parse(text) as DiscoveredSources;
        return sources;
    } catch (error) {
        console.error('Error discovering industry sources:', error);
        return {
            subreddits: ['marketing', 'smallbusiness', 'entrepreneur'], // Fallbacks
            youtubeKeywords: [industry, `${industry} trends`, `${industry} reviews`],
            otherForums: []
        };
    }
}
