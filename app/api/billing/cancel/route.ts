import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function POST() {
  try {
    if (!await getConvexWorkspaceContext()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await fetchAuthAction(api.billingActions.cancelSubscription, {}));
  } catch (error) { return convexRouteError(error); }
}
