import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function POST(request: Request) {
  try {
    if (!await getConvexWorkspaceContext()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (typeof body?.plan !== 'string') return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    return NextResponse.json(await fetchAuthAction(api.billingActions.stripeCheckout, { plan: body.plan }));
  } catch (error) { return convexRouteError(error); }
}
