import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';

export async function POST(request: NextRequest) {
    try {
        const context = await getConvexWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await request.json().catch(() => null);
        if (!body || typeof body.brandName !== 'string' ||
            ['website', 'industry', 'description', 'targetAudience'].some((key) => body[key] !== undefined && typeof body[key] !== 'string')) {
            return NextResponse.json({ error: 'Check the brand details.' }, { status: 400 });
        }
        await fetchAuthMutation(api.onboarding.saveBrand, { workspaceId: context.workspaceId,
            brandName: body.brandName, website: body.website, industry: body.industry,
            description: body.description, targetAudience: body.targetAudience });
        return NextResponse.json({ success: true });
    } catch (error) { return convexRouteError(error); }
}
