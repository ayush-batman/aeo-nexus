import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';
import { scoreOriginality } from '@/lib/ai/originality-scorer';

// POST: Score content originality
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content, topic } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        const result = await scoreOriginality(content, topic || 'general');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error scoring originality:', error);
        return NextResponse.json({ error: 'Failed to score originality' }, { status: 500 });
    }
}
