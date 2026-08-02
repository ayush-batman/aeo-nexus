import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/scan/public/[id]
// Public read for a share-link scan. No auth. Cache-friendly.

export const revalidate = 300; // 5 min, receipts don't change after write

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
        return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: scan, error } = await db
        .from('public_scans')
        .select('id, brand_name, prompt, platform, response, brand_mentioned, mention_position, sentiment, competitors_mentioned, citations, error_message, created_at')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('[scan/public/[id]]', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
    if (!scan) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ scan });
}
