import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getEntitlements } from '@/lib/entitlements';

// Lightweight read of the current org's plan + paid flag, for client UI that
// needs to show lock badges / upgrade nudges (e.g. the sidebar). Not a gate;
// the real enforcement lives on the feature pages and API routes.
export async function GET() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx) return NextResponse.json({ paid: false, plan: 'free' }, { status: 200 });
    const ent = await getEntitlements(ctx.orgId);
    return NextResponse.json({ paid: ent.paid, plan: ent.plan });
}
