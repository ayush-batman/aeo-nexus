import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';

export async function POST() {
    try {
        const context = await getConvexWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await fetchAuthMutation(api.onboarding.complete, { workspaceId: context.workspaceId });
        return NextResponse.json({ success: true });
    } catch (error) { return convexRouteError(error); }
}
