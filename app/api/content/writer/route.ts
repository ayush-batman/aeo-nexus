import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const { contentType, targetKeyword, topic } = await req.json();

        if (!topic || !contentType) {
            return NextResponse.json(
                { error: 'Content type and topic are required' },
                { status: 400 }
            );
        }

        const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        if (!geminiKey && !anthropicKey) {
            return NextResponse.json(
                { error: 'No AI provider API keys configured' },
                { status: 500 }
            );
        }

        const prompt = `You are an expert SEO and Aelo (Answer Engine Optimization) content writer. 
Your task is to write high-quality, comprehensive content optimized for both traditional search engines (Google) and AI Overviews/LLMs (ChatGPT, Perplexity, Claude).

Content Type requested: ${contentType}
Target Keyword: ${targetKeyword || 'N/A'}
Topic/Brief: ${topic}

Guidelines for Aelo Optimization:
1. Write in a clear, authoritative, and objective tone. Avoid fluff and marketing jargon.
2. Structure the content logically with clear headings (H2, H3).
3. Include bulleted or numbered lists wherever appropriate to make the content easily parsable by AI.
4. If appropriate for the content type, include an FAQ section with clear Question/Answer pairs.
5. Provide direct, factual answers early in the text.
6. Use markdown formatting.

Write the content now based on these instructions.`;

        // Try Gemini First
        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                // Using 2.0-flash as it's the standard in other files
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

                const result = await model.generateContent(prompt);
                const text = result.response.text();

                if (text) {
                    return NextResponse.json({ content: text });
                }
            } catch (error) {
                console.warn('Gemini generation failed, falling back to Claude:', error);
            }
        }

        // Fallback to Claude
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
                        max_tokens: 2000,
                        messages: [{ role: 'user', content: prompt }],
                    }),
                });

                if (claudeRes.ok) {
                    const data = await claudeRes.json();
                    const text = data.content?.[0]?.text;
                    if (text) {
                        return NextResponse.json({ content: text });
                    }
                } else {
                    const errorText = await claudeRes.text();
                    console.error('Claude API Error:', errorText);
                }
            } catch (error) {
                console.error('Claude fallback failed:', error);
            }
        }

        throw new Error('Failed to generate content with available AI providers');

    } catch (error) {
        console.error('AI Writer error:', error);
        return NextResponse.json(
            { error: 'Failed to generate content' },
            { status: 500 }
        );
    }
}
