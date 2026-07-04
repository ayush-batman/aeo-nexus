import { NextRequest, NextResponse } from "next/server";

// Contact form endpoint. For now logs to server console — enough for the
// marketing flow to be verifiable end-to-end. A follow-up will wire Resend
// (already installed) to email hello@aelo.sh.

interface Body {
    name?: string;
    email?: string;
    company?: string;
    role?: string;
    interest?: string;
    message?: string;
}

export async function POST(req: NextRequest) {
    let body: Body = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.email || typeof body.email !== "string") {
        return NextResponse.json({ error: "email required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string") {
        return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    console.log("[contact]", {
        at: new Date().toISOString(),
        name: body.name,
        email: body.email,
        company: body.company,
        role: body.role,
        interest: body.interest,
        message: body.message?.slice(0, 500),
    });

    // TODO: wire Resend to email hello@aelo.sh with body contents.
    return NextResponse.json({ received: true });
}
