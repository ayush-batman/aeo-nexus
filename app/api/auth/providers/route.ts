import { NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';

import { api } from '@/convex/_generated/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  let google = false;

  try {
    const status = await fetchQuery(
      api.authProviders.status,
      {},
      { url: process.env.NEXT_PUBLIC_CONVEX_URL },
    );
    google = status.google;
  } catch {
    // Fail closed: the sign-in button stays hidden when provider state cannot
    // be confirmed by the backend that owns the OAuth credentials.
  }

  return NextResponse.json(
    { google },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
