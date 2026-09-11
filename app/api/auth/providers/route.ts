import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return NextResponse.json(
    { google: Boolean(googleClientId && googleClientSecret) },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
