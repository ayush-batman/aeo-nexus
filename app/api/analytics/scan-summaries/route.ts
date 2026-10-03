import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import { convexRouteError } from '@/lib/convex/http';
import { getCurrentWorkspaceId } from '@/lib/data-access';

const PAGE_SIZE = 50;

function safeTimestamp(value: string | null): number | null {
  if (value === null || !/^\d{1,16}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const since = safeTimestamp(params.get('since'));
  const before = safeTimestamp(params.get('before'));
  const cursor = params.get('cursor');
  if (since === null || before === null || since < 0 || before <= since ||
      (cursor !== null && cursor.length > 2048)) {
    return NextResponse.json({ error: 'Please check the supplied scan window.' }, { status: 400 });
  }

  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
    const result = await fetchAuthQuery(api.records.analyticsScans, {
      workspaceId, since, before,
      paginationOpts: { numItems: PAGE_SIZE, cursor },
    });
    return NextResponse.json(result);
  } catch (error) {
    return convexRouteError(error);
  }
}
