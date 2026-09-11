import { NextResponse } from 'next/server';
import { readPublicScan } from '@/lib/convex/public-scan';
import { convexRouteError } from '@/lib/convex/http';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const scan = await readPublicScan(id);
    return NextResponse.json(scan ? { scan } : { error: 'not_found' }, { status: scan ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return convexRouteError(error); }
}
