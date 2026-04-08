import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface MinedQuestion {
    text: string;
    source: string;
    topic: string;
    type: 'comparison' | 'how-to' | 'recommendation' | 'troubleshooting' | 'feature' | 'pricing' | 'integration' | 'general';
    priority: 'high' | 'medium' | 'low';
    hasExistingContent: boolean;
}

// POST: Mine questions from various sources using AI
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sourceType, input, brandName, industry } = await request.json();

        if (!input || !brandName) {
            return NextResponse.json(
                { error: 'input and brandName are required' },
                { status: 400 }
            );
        }

        const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json(
                { error: 'No AI API key configured. Set GEMINI_API_KEY in .env.local' },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        let prompt = '';

        switch (sourceType) {
            case 'transcript':
                prompt = `You are an AEO (Answer Engine Optimization) expert. Analyze this sales call / support ticket transcript and extract every question that potential customers are asking about "${brandName}"${industry ? ` in the ${industry} industry` : ''}.

Transcript:
"""
${input.slice(0, 5000)}
"""

For each question, also:
- Assign a topic cluster
- Classify the question type (comparison, how-to, recommendation, troubleshooting, feature, pricing, integration, general)
- Rate priority (high = high purchase intent, medium = research phase, low = casual)
- Guess if ${brandName} likely already has content answering this (hasExistingContent)

Return ONLY valid JSON:
{
  "questions": [
    { "text": "...", "source": "transcript", "topic": "...", "type": "...", "priority": "...", "hasExistingContent": false }
  ],
  "topics": ["topic1", "topic2"]
}`;
                break;

            case 'support':
                prompt = `You are an AEO expert. Analyze these support tickets/FAQs and extract the long-tail questions customers are asking about "${brandName}"${industry ? ` in the ${industry} industry` : ''}. Focus on specific, niche questions that a help center should answer.

Support content:
"""
${input.slice(0, 5000)}
"""

For each question:
- Assign a topic cluster
- Classify type (comparison, how-to, recommendation, troubleshooting, feature, pricing, integration, general)
- Rate priority (high/medium/low based on frequency and impact)
- Guess if existing content answers this already

Return ONLY valid JSON:
{
  "questions": [
    { "text": "...", "source": "support", "topic": "...", "type": "...", "priority": "...", "hasExistingContent": false }
  ],
  "topics": ["topic1", "topic2"]
}`;
                break;

            case 'brainstorm':
                prompt = `You are an AEO expert. For the brand "${brandName}"${industry ? ` in the ${industry} industry` : ''}, brainstorm all possible long-tail questions that potential customers might ask AI assistants.

Context provided by user:
"""
${input.slice(0, 3000)}
"""

Generate at least 30 questions across these categories:
- Comparison questions ("X vs Y", "best alternatives to...")
- How-to questions ("how to use X for...", "how to set up...")
- Recommendation questions ("best X for...", "which X should I...")
- Troubleshooting ("X not working with...", "how to fix...")
- Feature questions ("does X support...", "can X do...")
- Pricing questions ("how much does X cost...", "X free plan vs paid...")
- Integration questions ("does X integrate with...", "X API for...")

For each question:
- Assign a topic cluster
- Classify type
- Rate priority
- Set hasExistingContent to false (these are brainstormed)

Return ONLY valid JSON:
{
  "questions": [
    { "text": "...", "source": "brainstorm", "topic": "...", "type": "...", "priority": "...", "hasExistingContent": false }
  ],
  "topics": ["topic1", "topic2"]
}`;
                break;

            default:
                return NextResponse.json({ error: 'Invalid sourceType. Use: transcript, support, or brainstorm' }, { status: 400 });
        }

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return NextResponse.json({ error: 'AI failed to generate structured questions' }, { status: 500 });
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
    } catch (error) {
        console.error('Error mining questions:', error);
        return NextResponse.json({ error: 'Failed to mine questions' }, { status: 500 });
    }
}
