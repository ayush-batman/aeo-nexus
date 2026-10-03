import { NextResponse } from 'next/server';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { convexRouteError } from '@/lib/convex/http';
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 10000) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.query !== 'string' || (body.brandName !== undefined && typeof body.brandName !== 'string') || (body.industry !== undefined && typeof body.industry !== 'string') || (body.mode !== undefined && typeof body.mode !== 'string')) return NextResponse.json({ error: 'Please check the supplied values.' }, { status: 400 });
    const result = await callInternal('action', internal.discoveryActions.prompts, {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown',
      query: body.query, brandName: body.brandName, industry: body.industry, mode: body.mode });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    return convexRouteError(error);
  }
}
