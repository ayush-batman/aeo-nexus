import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
    try {
        const { threadTitle, threadContext, tone = 'helpful' } = await request.json();

        if (!threadTitle) {
            return NextResponse.json(
                { error: 'Thread title is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI API key not configured' },
                { status: 503 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        let prompt = `You are a helpful expert engaging in an online forum discussion.
        
Thread Title: "${threadTitle}"
${threadContext ? `Context: "${threadContext}"` : ''}

Your goal is to write a comment that adds value to this discussion.
Tone: ${tone} (e.g., helpful, enthusiastic, professional, casual)

Guidelines:
- Be concise (under 150 words).
- Be genuine and authentic.
- Don't sound like a bot.
- If recommending something, explain why.
- Use formatting (bullet points) if helpful.

Draft the comment now:`;

        const result = await model.generateContent(prompt);
        const comment = result.response.text();

        return NextResponse.json({ comment });
    } catch (error) {
        console.error('Comment generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate comment' },
            { status: 500 }
        );
    }
}
