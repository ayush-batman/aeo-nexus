import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/newsletter/subscribe
// Small, honest signup endpoint. Idempotent: re-subscribing an existing
// address returns 'already subscribed' rather than an error. No
// double-opt-in email yet — Sage rule: ship the smallest honest thing,
// add confirmation flow when list size warrants it.

interface Body {
    email?:  string;
    source?: string;   // 'blog', 'post', 'india-index', 'landing', etc.
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    let body: Body = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const source = body.source?.trim().slice(0, 40) ?? null;

    try {
        const db = createAdminClient();

        // Upsert: if already subscribed + still active → return that.
        // If unsubscribed previously → reactivate.
        const { data: existing } = await db
            .from('newsletter_subscribers')
            .select('id, status')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'active') {
                return NextResponse.json({ ok: true, status: 'already_subscribed' });
            }
            const { error: updateErr } = await db
                .from('newsletter_subscribers')
                .update({ status: 'active', unsubscribed_at: null })
                .eq('id', existing.id);
            if (updateErr) throw updateErr;
            return NextResponse.json({ ok: true, status: 'reactivated' });
        }

        const { error: insertErr } = await db
            .from('newsletter_subscribers')
            .insert({ email, source });
        if (insertErr) throw insertErr;

        return NextResponse.json({ ok: true, status: 'subscribed' });
    } catch (err) {
        console.error('[newsletter/subscribe]', err);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
