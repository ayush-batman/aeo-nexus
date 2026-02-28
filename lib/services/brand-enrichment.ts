
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

interface EnrichedBrand {
    name: string;
    industry: string;
    description: string;
    targetAudience: string;
    competitors: string[];
}

export async function enrichBrandFromUrl(url: string): Promise<EnrichedBrand> {
    try {
        // 1. Fetch Page Content
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

        // Clean up
        $('script, style, noscript, svg').remove();
        const textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000);
        const title = $('meta[property="og:site_name"]').attr('content')
            || $('meta[name="application-name"]').attr('content')
            || $('title').text();
        const metaDesc = $('meta[name="description"]').attr('content')
            || $('meta[property="og:description"]').attr('content')
            || '';

        // Fallback baseline if AI is unavailable
        const fallback: EnrichedBrand = {
            name: title || new URL(url).hostname.replace('www.', ''),
            industry: 'Other',
            description: metaDesc || 'No description available.',
            targetAudience: 'General',
            competitors: [],
        };

        // 2. Analyze with Gemini (optional)
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return fallback;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Analyze this website content and extract the brand details.

Title: ${title}
Meta Description: ${metaDesc}
Content Snippet: ${textContent}

Return a valid JSON object with:
- "name": inferred brand name
- "industry": specific industry (e.g. "SaaS - Marketing", "E-commerce - Fashion")
- "description": 1-sentence summary of what they do
- "targetAudience": 2-3 word description of who they sell to (e.g. "Small Business Owners")
- "competitors": array of 3 potential competitors based on the industry
`;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            return {
                name: data.name || fallback.name,
                industry: data.industry || fallback.industry,
                description: data.description || fallback.description,
                targetAudience: data.targetAudience || fallback.targetAudience,
                competitors: data.competitors || fallback.competitors,
            };
        } catch (error) {
            console.warn('Brand enrichment AI failed, using fallback:', error);
            return fallback;
        }
    } catch (error) {
        console.error('Brand enrichment failed:', error);
        throw error;
    }
}
