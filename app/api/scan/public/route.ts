import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scanLLM } from '@/lib/ai/llm-scanner';
import crypto from 'crypto';

// POST /api/scan/public
// Free-tier scan for unauthenticated visitors. Rate-limited by
// sha256(IP + user-agent) to 3 scans per 7 days per visitor. Every
// successful scan produces a shareable receipt at /scan/{id}.
//
// Sage rule: honest error state when the LLM fails, honest 'you've
// used your free scans' state when rate-limited. No stealth mocks.

const FREE_LIMIT     = 3;
const WINDOW_DAYS    = 7;

// Salt only needs to be stable across a deploy for rate-limit accounting.
// Real anonymity is not the goal here, light abuse prevention is.
const IP_SALT = process.env.PUBLIC_SCAN_IP_SALT ?? 'aelo-public-scan-2026';

interface Body {
    brandName?: string;
    prompt?:    string;
}

function hashIp(ip: string, ua: string): string {
    return crypto
        .createHash('sha256')
        .update(`${IP_SALT}:${ip}:${ua}`)
        .digest('hex')
        .slice(0, 32);
}

export async function POST(req: NextRequest) {
    let body: Body = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const brandName = body.brandName?.trim();
    const prompt    = body.prompt?.trim();

    if (!brandName || brandName.length < 2 || brandName.length > 80) {
        return NextResponse.json({ error: 'invalid_brand_name' }, { status: 400 });
    }
    if (!prompt || prompt.length < 8 || prompt.length > 240) {
        return NextResponse.json({ error: 'invalid_prompt' }, { status: 400 });
    }

    // Derive visitor identity.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
    const ua = req.headers.get('user-agent') ?? 'unknown';
    const ipHash = hashIp(ip, ua);

    const db = createAdminClient();

    // Rate limit, count recent scans from this visitor.
    const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await db
        .from('public_scans')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', windowStart);

    if ((recentCount ?? 0) >= FREE_LIMIT) {
        return NextResponse.json({
            error:       'rate_limited',
            message:     `You've used your ${FREE_LIMIT} free scans for this week.`,
            resetInDays: WINDOW_DAYS,
        }, { status: 429 });
    }

    // Run the scan. Gemini only for the free tier, cheapest, most reliably
    // available, honest scope for the demo.
    try {
        const { results } = await scanLLM({
            prompt,
            brandName,
            platforms: ['gemini'],
            competitors: [],
        });

        const geminiResult = results.find(r => r.platform === 'gemini');
        if (!geminiResult) {
            // No result at all, record the failure honestly.
            const { data: failedScan } = await db
                .from('public_scans')
                .insert({
                    ip_hash: ipHash,
                    brand_name: brandName,
                    prompt,
                    platform: 'gemini',
                    error_message: 'Scan provider returned no result.',
                })
                .select('id')
                .single();

            return NextResponse.json({
                error:  'scan_failed',
                scanId: failedScan?.id,
                message: 'The scan provider returned no response. Try again in a moment.',
            }, { status: 502 });
        }

        // Persist real result.
        const { data: newScan, error: insertErr } = await db
            .from('public_scans')
            .insert({
                ip_hash:               ipHash,
                brand_name:            brandName,
                prompt,
                platform:              'gemini',
                response:              geminiResult.response,
                brand_mentioned:       geminiResult.brandMentioned,
                mention_position:      geminiResult.mentionPosition,
                sentiment:             geminiResult.sentiment,
                competitors_mentioned: geminiResult.competitorsMentioned,
                citations:             geminiResult.citations,
            })
            .select('id')
            .single();

        if (insertErr || !newScan) {
            console.error('[scan/public] insert failed:', insertErr);
            return NextResponse.json({ error: 'server_error' }, { status: 500 });
        }

        const scansUsedThisWindow = (recentCount ?? 0) + 1;

        return NextResponse.json({
            ok:      true,
            scanId:  newScan.id,
            shareUrl: `/scan/${newScan.id}`,
            result: {
                platform:              'gemini',
                brandMentioned:        geminiResult.brandMentioned,
                mentionPosition:       geminiResult.mentionPosition,
                sentiment:             geminiResult.sentiment,
                competitorsMentioned:  geminiResult.competitorsMentioned,
                citations:             geminiResult.citations,
                response:              geminiResult.response,
            },
            rateLimit: {
                used:      scansUsedThisWindow,
                limit:     FREE_LIMIT,
                remaining: Math.max(0, FREE_LIMIT - scansUsedThisWindow),
                windowDays: WINDOW_DAYS,
            },
        });
    } catch (err) {
        console.error('[scan/public]', err);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
