import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';
import { GoogleGenerativeAI } from '@google/generative-ai';

// POST: Generate a topic cluster from a money term
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { moneyTerm, industry, brandName } = await request.json();

        if (!moneyTerm) {
            return NextResponse.json({ error: 'moneyTerm is required' }, { status: 400 });
        }

        const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json({ error: 'No AI API key configured' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(
            `You are an AEO (Answer Engine Optimization) content strategist. Create a comprehensive topic cluster for the money term "${moneyTerm}"${industry ? ` in the ${industry} industry` : ''}${brandName ? ` for the brand "${brandName}"` : ''}.

A topic cluster should cover this money term so thoroughly that LLMs will cite this content for ANY related question.

Return ONLY valid JSON:
{
  "pillar": {
    "title": "Pillar page title",
    "slug": "url-friendly-slug",
    "outline": ["Section 1: ...", "Section 2: ...", "Section 3: ..."],
    "targetWordCount": 3000,
    "brief": "One paragraph content brief"
  },
  "subTopics": [
    {
      "title": "Sub-topic title",
      "slug": "url-friendly-slug",
      "questions": ["Question this page answers", "Another question"],
      "brief": "One-line content brief",
      "priority": "high|medium|low",
      "type": "how-to|comparison|guide|faq|case-study",
      "linksTo": ["slug-of-related-subtopic"]
    }
  ],
  "internalLinks": [
    { "from": "slug", "to": "slug", "anchorText": "suggested anchor text" }
  ],
  "totalEstimatedWords": 25000,
  "estimatedTimeToCreate": "X weeks"
}`
        );

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return NextResponse.json({ error: 'AI failed to generate topic cluster' }, { status: 500 });
        }

        const cluster = JSON.parse(jsonMatch[0]);
        return NextResponse.json(cluster);
    } catch (error) {
        console.error('Error generating topic cluster:', error);
        return NextResponse.json({ error: 'Failed to generate topic cluster' }, { status: 500 });
    }
}
