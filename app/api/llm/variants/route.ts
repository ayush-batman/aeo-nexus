import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';
import { GoogleGenerativeAI } from '@google/generative-ai';

// POST: Generate prompt variants for statistical SoV measurement
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { prompt, count = 5 } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
        }

        const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            // Fallback: generate simple variants without AI
            const variants = generateSimpleVariants(prompt, count);
            return NextResponse.json({ variants });
        }

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(
            `Generate exactly ${count} different ways to ask the same question. Each variant should:
- Keep the same intent/meaning
- Use different phrasing, word choice, or structure
- Include variations like "what is the best...", "recommend me...", "top X for...", "which ... should I use"
- Be natural questions a real user would ask an AI assistant

Original question: "${prompt}"

Return ONLY a JSON array of strings, no other text:
["variant 1", "variant 2", ...]`
        );

        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const variants = JSON.parse(jsonMatch[0]) as string[];
            // Always include the original
            const allVariants = [prompt, ...variants.filter((v: string) => v !== prompt).slice(0, count)];
            return NextResponse.json({ variants: allVariants });
        }

        // Fallback
        const variants = generateSimpleVariants(prompt, count);
        return NextResponse.json({ variants });
    } catch (error) {
        console.error('Error generating variants:', error);
        return NextResponse.json({ error: 'Failed to generate variants' }, { status: 500 });
    }
}

function generateSimpleVariants(prompt: string, count: number): string[] {
    const prefixes = [
        'What is the best',
        'Can you recommend',
        'Top options for',
        'Which is the best',
        'I need help finding',
        'What do you suggest for',
        'Compare the best',
    ];

    // Extract the core topic from the prompt
    const topic = prompt
        .replace(/^(what is the best|can you recommend|top|which|compare|suggest|find|help me with)\s*/i, '')
        .replace(/\?$/, '')
        .trim();

    const variants = [prompt]; // Always include original
    for (let i = 0; i < Math.min(count, prefixes.length); i++) {
        const variant = `${prefixes[i]} ${topic}?`;
        if (variant !== prompt) {
            variants.push(variant);
        }
    }

    return variants.slice(0, count + 1);
}
