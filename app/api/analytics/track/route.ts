import { NextResponse } from 'next/server';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { AnalyticsInputError, readBoundedJson } from '@/lib/analytics-ingest';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function POST(request: Request) {
  try {
    const body = await readBoundedJson(request, 16384);
    const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim().slice(0, 128);
    await callInternal('action', internal.trafficActions.ingest, { body: JSON.stringify(body), ip });
    return NextResponse.json({ success: true }, { status: 202, headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = error instanceof AnalyticsInputError ? error.status : message === 'invalid_ingest_token' ? 401
      : message === 'rate_limit_exceeded' ? 429 : message.startsWith('invalid_') ? 400 : 503;
    return NextResponse.json({ error: status === 429 ? 'Rate limit exceeded' : 'Event could not be recorded' },
      { status, headers: { ...cors, ...(status === 429 || status === 503 ? { 'Retry-After': '60' } : {}) } });
  }
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
