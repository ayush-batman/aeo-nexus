import { NextRequest, NextResponse } from 'next/server';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { readPublicScan } from '@/lib/convex/public-scan';
import { convexRouteError } from '@/lib/convex/http';
import { prefersRespondAsync } from '@/lib/http-prefer';
export const maxDuration = 300;
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.brandName !== 'string' || typeof body.prompt !== 'string') return NextResponse.json({ error: 'invalid_public_scan' }, { status: 400 });
    const brandName = body.brandName.trim(), prompt = body.prompt.trim();
    if (brandName.length < 2 || brandName.length > 80 || prompt.length < 8 || prompt.length > 240) return NextResponse.json({ error: 'invalid_public_scan' }, { status: 400 });
    const requestId = request.headers.get('idempotency-key') || crypto.randomUUID();
    if (!/^[a-f0-9-]{36}$/i.test(requestId)) return NextResponse.json({ error: 'invalid_public_scan' }, { status: 400 });
    const result = await callInternal('action', internal.publicScanActions.start, { id: requestId,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown', brandName, prompt });
    const deadline = Date.now()+230000;
    const rateLimit = { used: result.used, limit: 3, remaining: Math.max(0,3-result.used), windowDays: 7 };
    if (prefersRespondAsync(request.headers)) {
      return NextResponse.json({ scanId: result.id, status: 'queued', shareUrl: `/scan/${result.id}`,
        statusUrl: `/api/scan/public/${result.id}`, rateLimit }, { status: 202 });
    }
    do {
      const scan = await readPublicScan(result.id);
      if (!scan) throw new Error('public_scan_missing');
      if (scan.status === 'failed') return NextResponse.json({ error: 'scan_failed', scanId: result.id, message: scan.error_message }, { status: 502 });
      if (scan.status === 'complete') return NextResponse.json({ ok: true, scanId: result.id, shareUrl: `/scan/${result.id}`, result: {
        platform: scan.platform, brandMentioned: scan.brand_mentioned, mentionPosition: scan.mention_position, sentiment: scan.sentiment,
        competitorsMentioned: scan.competitors_mentioned, competitorTrackingStatus: scan.competitor_tracking_status,
        answerNameCandidates: scan.answer_name_candidates, citations: scan.citations, response: scan.response, sampleCount: scan.sample_count,
      }, rateLimit });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } while (Date.now() < deadline);
    return NextResponse.json({ scanId: result.id, status: 'running', shareUrl: `/scan/${result.id}`, statusUrl: `/api/scan/public/${result.id}`, rateLimit }, { status: 202 });
  } catch (error) { return convexRouteError(error); }
}
