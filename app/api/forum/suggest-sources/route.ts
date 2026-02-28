
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';
import { discoverIndustrySources } from '@/lib/services/source-discovery';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { industry, targetAudience, productName } = body;

        if (!industry) {
            return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
        }

        const suggestions = await discoverIndustrySources(industry, targetAudience || '', productName);

        return NextResponse.json({
            success: true,
            suggestions
        });

    } catch (error) {
        console.error('Source suggestion error:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}
