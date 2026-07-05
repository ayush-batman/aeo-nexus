import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Contact form endpoint. Delivers submissions to hello@aelo.sh via Resend.
// Also logs to server console so we can audit received submissions even when
// email delivery is misconfigured.

interface Body {
    name?: string;
    email?: string;
    company?: string;
    role?: string;
    interest?: string;
    message?: string;
}

const TO_EMAIL   = process.env.CONTACT_TO_EMAIL   || "hello@aelo.sh";
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "Aelo <hello@aeonexus.com>";

// Basic RFC 5322-adjacent shape check. Not exhaustive — Resend rejects
// obvious garbage server-side; we just avoid submitting nonsense.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    let body: Body = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.email || typeof body.email !== "string" || !EMAIL_RE.test(body.email)) {
        return NextResponse.json({ error: "valid email required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    // Honeypot: cap message length to keep the endpoint uninteresting to bots.
    const message = body.message?.slice(0, 2000);

    const payload = {
        name:     body.name.trim(),
        email:    body.email.trim(),
        company:  body.company?.trim() || null,
        role:     body.role?.trim() || null,
        interest: body.interest?.trim() || null,
        message:  message || null,
    };

    // Always log — a durable audit trail even if delivery fails.
    console.log("[contact]", { at: new Date().toISOString(), ...payload });

    // If no key, degrade gracefully. The submission is still logged; the
    // user still sees the receipt UI. Preferred over throwing on prod.
    if (!process.env.RESEND_API_KEY) {
        console.warn("[contact] RESEND_API_KEY not set — email skipped");
        return NextResponse.json({ received: true, delivered: false });
    }

    const interestLabel = payload.interest
        ? { command: "Command tier", concierge: "Concierge tier", agency: "Agency partnership", "india-index": "India Index inclusion" }[payload.interest] ?? payload.interest
        : "general inquiry";

    const subject = `[Aelo contact] ${payload.name} — ${interestLabel}`;

    // Plain-text body: readable, spam-filter friendly, greppable in inboxes.
    const text = [
        `New contact submission from ${payload.name}`,
        ``,
        `Email:     ${payload.email}`,
        `Company:   ${payload.company ?? "—"}`,
        `Role:      ${payload.role ?? "—"}`,
        `Interest:  ${interestLabel}`,
        ``,
        `Message:`,
        payload.message ?? "(no message)",
        ``,
        `— submitted ${new Date().toISOString()}`,
    ].join("\n");

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [TO_EMAIL],
            replyTo: payload.email,
            subject,
            text,
        });
        if (error) {
            console.error("[contact] Resend error:", error);
            return NextResponse.json({ received: true, delivered: false }, { status: 200 });
        }
        return NextResponse.json({ received: true, delivered: true });
    } catch (err) {
        console.error("[contact] Failed to send:", err);
        return NextResponse.json({ received: true, delivered: false }, { status: 200 });
    }
}
