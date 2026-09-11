import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import rateLimit, { RateLimitExceededError } from "@/lib/rate-limit";

// Contact form endpoint. Delivers submissions to hello@aelohq.com via Resend.

interface Body {
    name?: string;
    email?: string;
    company?: string;
    role?: string;
    interest?: string;
    message?: string;
}

const TO_EMAIL   = process.env.CONTACT_TO_EMAIL   || "hello@aelohq.com";
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "Aelo <hello@aeonexus.com>";

// Basic RFC 5322-adjacent shape check. Not exhaustive, Resend rejects
// obvious garbage server-side; we just avoid submitting nonsense.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERESTS = new Set(["command", "concierge", "agency", "press", "security", "other"]);
const limiter = rateLimit({ namespace: "contact", interval: 60 * 60 * 1000 });

function optionalText(value: unknown, max: number): value is string | undefined {
    return value === undefined || (typeof value === "string" && value.length <= max);
}

export async function POST(req: NextRequest) {
    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim().slice(0, 128);
    try {
        await limiter.check(5, ip);
    } catch (error) {
        if (error instanceof RateLimitExceededError) {
            return NextResponse.json({ error: "Too many messages. Please try again later." }, {
                status: 429,
                headers: { "Retry-After": String(error.retryAfterSeconds) },
            });
        }
        return NextResponse.json({ error: "Contact service is temporarily unavailable." }, { status: 503 });
    }

    let body: Body = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.email || typeof body.email !== "string" || body.email.length > 254 || !EMAIL_RE.test(body.email)) {
        return NextResponse.json({ error: "valid email required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 200) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    if (!optionalText(body.company, 200) || !optionalText(body.role, 200) ||
        !optionalText(body.interest, 40) || !optionalText(body.message, 2000) ||
        (body.interest !== undefined && !INTERESTS.has(body.interest))) {
        return NextResponse.json({ error: "invalid contact details" }, { status: 400 });
    }

    const payload = {
        name:     body.name.trim(),
        email:    body.email.trim(),
        company:  body.company?.trim() || null,
        role:     body.role?.trim() || null,
        interest: body.interest?.trim() || null,
        message:  body.message?.trim() || null,
    };

    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: "Contact delivery is not configured." }, { status: 503 });
    }

    const interestLabel = payload.interest
        ? { command: "Command tier", concierge: "Concierge tier", agency: "Agency partnership", "india-index": "India Index inclusion" }[payload.interest] ?? payload.interest
        : "general inquiry";

    const subject = `[Aelo contact] ${payload.name}, ${interestLabel}`;

    // Plain-text body: readable, spam-filter friendly, greppable in inboxes.
    const text = [
        `New contact submission from ${payload.name}`,
        ``,
        `Email:     ${payload.email}`,
        `Company:   ${payload.company ?? ", "}`,
        `Role:      ${payload.role ?? ", "}`,
        `Interest:  ${interestLabel}`,
        ``,
        `Message:`,
        payload.message ?? "(no message)",
        ``,
        `, submitted ${new Date().toISOString()}`,
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
            return NextResponse.json({ error: "Contact delivery was not confirmed." }, { status: 502 });
        }
        return NextResponse.json({ received: true, delivered: true });
    } catch {
        return NextResponse.json({ error: "Contact delivery failed." }, { status: 502 });
    }
}
