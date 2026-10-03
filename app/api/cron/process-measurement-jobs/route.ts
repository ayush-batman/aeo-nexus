import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
// Compatibility trigger. Convex owns recurrence, claims, quotas, and execution.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(request.headers.get('authorization') || '');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const processed = await callInternal('mutation', internal.scheduled.reconcileInitialJobs, {});
    return NextResponse.json({ success: true, processed });
  } catch { return NextResponse.json({ error: 'Background dispatcher unavailable' }, { status: 503 }); }
}
