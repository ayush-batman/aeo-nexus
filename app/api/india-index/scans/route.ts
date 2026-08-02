import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PUBLIC endpoint. Returns the raw scans behind a brand's India-Index
// entry so anyone (unauthenticated) can audit the number themselves.
// Zero PII is exposed, the brands are public, the prompts are public,
// the LLM responses are public. This is the Sage trust bet.

// Allowlist by brand name to avoid arbitrary workspace enumeration.
// Kept in sync with lib/india-index.ts CATEGORY map. Any brand added
// there without adding here won't be able to serve public receipts.
const INDIA_BRAND_NAMES = new Set([
    // SaaS
    'Zoho', 'Freshworks', 'Postman', 'Chargebee', 'Zomato', 'Whatfix',
    // Fintech
    'Razorpay', 'Zerodha', 'PhonePe', 'Cred', 'Paytm', 'Groww', 'Upstox',
    // D2C
    'BoAt', 'Mamaearth', 'Wakefit', 'Nykaa', 'Sugar Cosmetics', 'Lenskart', 'Meesho',
    // EdTech
    "Byju's", 'Unacademy', 'PhysicsWallah', 'upGrad', 'Great Learning', 'Vedantu',
]);

export const revalidate = 900; // 15 min, same as the Index page

export async function GET(request: NextRequest) {
    const brand = request.nextUrl.searchParams.get('brand');
    if (!brand || !INDIA_BRAND_NAMES.has(brand)) {
        return NextResponse.json({ error: 'unknown brand' }, { status: 404 });
    }

    try {
        const db = createAdminClient();

        // Look up the workspace by name (allowlisted), no auth needed
        // because this data is intentionally public for the Index.
        const { data: ws } = await db
            .from('workspaces')
            .select('id')
            .eq('name', brand)
            .limit(1)
            .maybeSingle();

        if (!ws) return NextResponse.json({ scans: [] });

        const { data: scans, error } = await db
            .from('llm_scans')
            .select('id, platform, prompt, response, brand_mentioned, mention_position, sentiment, competitors_mentioned, citations, created_at')
            .eq('workspace_id', ws.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({
            brand,
            scans: scans ?? [],
        });
    } catch (err) {
        console.error('[india-index/scans]', err);
        return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
}
