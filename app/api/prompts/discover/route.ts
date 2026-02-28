import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from '@/lib/rate-limit';

// Rate limit: 10 discovers per IP per hour
const discoverLimiter = rateLimit({
    interval: 60 * 60 * 1000,
    uniqueTokenPerInterval: 500,
});

// Google Autocomplete suggestions (unofficial but widely-used endpoint)
async function getAutocompleteSuggestions(query: string): Promise<string[]> {
    try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) return [];

        const data = await response.json();
        // Response format: [query, [suggestions]]
        return (data[1] || []).slice(0, 10);
    } catch (err) {
        console.error('Autocomplete fetch failed:', err);
        return [];
    }
}

// Use Gemini to generate PAA-style questions for a topic
async function getPeopleAlsoAsk(topic: string, brandName?: string, industry?: string): Promise<string[]> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return [];

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an SEO expert specializing in AI Engine Optimization (AEO). 
Generate exactly 10 "People Also Ask" style questions that real users would search for related to the topic below.
${brandName ? `Brand context: ${brandName}` : ''}
${industry ? `Industry: ${industry}` : ''}

Topic: "${topic}"

Rules:
- Questions should be the kind that appear in Google's "People Also Ask" section
- Include questions about comparisons, reviews, alternatives, pricing, features
- Include questions that would trigger AI Overviews on Google
- Make them specific and natural-sounding
- Return ONLY the questions, one per line, numbered 1-10
- No extra text or explanations`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse numbered lines
        return text
            .split('\n')
            .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(line => line.length > 10 && line.endsWith('?'));
    } catch (err) {
        console.error('PAA generation failed:', err);
        return [];
    }
}

export async function POST(req: NextRequest) {
    try {
        // Rate limit by IP
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        try {
            await discoverLimiter.check(10, `discover-${ip}`);
        } catch {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Try again later.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { query, brandName, industry, mode = 'all' } = body;

        if (!query || query.trim().length < 2) {
            return NextResponse.json(
                { error: 'Query must be at least 2 characters' },
                { status: 400 }
            );
        }

        const results: {
            autocomplete: string[];
            peopleAlsoAsk: string[];
            relatedQueries: string[];
        } = {
            autocomplete: [],
            peopleAlsoAsk: [],
            relatedQueries: [],
        };

        // Run both fetches in parallel
        const promises: Promise<void>[] = [];

        if (mode === 'all' || mode === 'autocomplete') {
            promises.push(
                getAutocompleteSuggestions(query).then(suggestions => {
                    results.autocomplete = suggestions;
                })
            );

            // Also get "vs" and "alternative" variants
            promises.push(
                getAutocompleteSuggestions(`${query} vs`).then(suggestions => {
                    results.relatedQueries.push(...suggestions.slice(0, 5));
                })
            );
            promises.push(
                getAutocompleteSuggestions(`best ${query}`).then(suggestions => {
                    results.relatedQueries.push(...suggestions.slice(0, 5));
                })
            );
        }

        if (mode === 'all' || mode === 'paa') {
            promises.push(
                getPeopleAlsoAsk(query, brandName, industry).then(questions => {
                    results.peopleAlsoAsk = questions;
                })
            );
        }

        await Promise.all(promises);

        // Deduplicate related queries
        results.relatedQueries = [...new Set(results.relatedQueries)];

        return NextResponse.json(results);
    } catch (err) {
        console.error('Prompt discovery error:', err);
        return NextResponse.json(
            { error: 'Failed to discover prompts' },
            { status: 500 }
        );
    }
}
