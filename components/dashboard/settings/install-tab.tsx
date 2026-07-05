"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Zap, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    workspaceId:   string;
    workspaceName: string;
}

// Sage-archetype install page. Shows a copy-pasteable snippet, verification
// status, and instructions. No fanfare — the receipt is the message.
export function InstallTab({ workspaceId, workspaceName }: Props) {
    const [origin, setOrigin] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [verified, setVerified] = useState(false);
    const [aiVisits, setAiVisits] = useState(0);
    const [totalVisits, setTotalVisits] = useState(0);

    useEffect(() => {
        // window.location.origin runs client-side only — SSR would 500 otherwise.
        setOrigin(window.location.origin);
    }, []);

    // Poll analytics summary once on mount. If any track events landed for
    // this workspace, we're verified — no other signal needed.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/analytics/summary", { cache: "no-store" });
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (cancelled) return;
                const total = data?.totalVisits ?? 0;
                const ai = data?.aiVisits ?? 0;
                setTotalVisits(total);
                setAiVisits(ai);
                setVerified(total > 0);
            } catch {
                if (!cancelled) setVerified(false);
            } finally {
                if (!cancelled) setVerifying(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const snippet = origin
        ? `<script id="aeo-pixel" src="${origin}/aelo-pixel.js" data-workspace-id="${workspaceId}" async></script>`
        : "";

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard blocked; user can still select-all */
        }
    }

    return (
        <div className="space-y-6">
            {/* Verification receipt */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="w-4 h-4 text-[var(--accent-base)]" />
                                Install Aelo on your site
                            </CardTitle>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                One script tag on {workspaceName || "your site"} lets Aelo see which AI
                                answers actually drive traffic. Attribution turns on the moment
                                the first request arrives.
                            </p>
                        </div>
                        <VerifyBadge verifying={verifying} verified={verified} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Snippet */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-[0.12em]">
                                Paste before <code className="font-mono text-[10px] bg-[var(--bg-raised)] px-1 py-0.5 rounded">&lt;/head&gt;</code>
                            </label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                disabled={!snippet}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        Copy
                                    </>
                                )}
                            </Button>
                        </div>
                        <pre className="p-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-raised)] text-[12px] font-mono text-[var(--text-primary)] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                            {snippet || "Loading…"}
                        </pre>
                    </div>

                    {/* Reality check */}
                    {verified ? (
                        <div className="flex items-start gap-2.5 p-3 rounded-md bg-[var(--data-green-muted)] border border-[var(--data-green)]/25">
                            <CheckCircle className="w-4 h-4 mt-0.5 text-[var(--data-green)] flex-shrink-0" />
                            <div className="text-sm">
                                <div className="font-medium text-[var(--text-primary)]">
                                    Installed. {totalVisits} visits captured
                                    {aiVisits > 0 && <> · {aiVisits} from AI</>}.
                                </div>
                                <div className="text-[var(--text-secondary)] text-xs mt-0.5">
                                    Attribution is live. See the source breakdown in{" "}
                                    <a href="/dashboard/attribution" className="text-[var(--accent-base)] hover:underline">
                                        Attribution
                                    </a>.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2.5 p-3 rounded-md bg-[var(--bg-raised)] border border-[var(--border-default)]">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0" />
                            <div className="text-sm">
                                <div className="font-medium text-[var(--text-primary)]">
                                    Not detected yet.
                                </div>
                                <div className="text-[var(--text-secondary)] text-xs mt-0.5">
                                    Once you deploy the snippet, refresh this page — verification
                                    happens on the first pageview.
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* How-to */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Framework-specific placement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <FrameworkRow name="Next.js (App Router)"    location="app/layout.tsx — inside the <head>, or use next/script with strategy='afterInteractive'" />
                    <FrameworkRow name="Next.js (Pages Router)"  location="pages/_document.tsx — inside <Head> in the <Html>" />
                    <FrameworkRow name="React / Vite / CRA"      location="public/index.html — inside <head>" />
                    <FrameworkRow name="Webflow / Framer"        location="Site Settings → Custom Code → Head Code" />
                    <FrameworkRow name="Shopify"                 location="Online Store → Themes → Edit code → theme.liquid, inside <head>" />
                    <FrameworkRow name="WordPress"               location="Appearance → Theme File Editor → header.php, before </head> — or a plugin like Insert Headers and Footers" />
                    <FrameworkRow name="Static HTML"             location="Just paste before </head> and re-deploy" />
                </CardContent>
            </Card>

            {/* Docs link */}
            <div className="flex items-center justify-between px-4 py-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)]">
                <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Need help?</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Full install docs, event API, and self-hosting notes.
                    </div>
                </div>
                <a
                    href="/docs"
                    className="text-sm font-medium text-[var(--accent-base)] hover:text-[var(--accent-hover)] inline-flex items-center gap-1"
                >
                    Read the docs <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>
    );
}

function VerifyBadge({ verifying, verified }: { verifying: boolean; verified: boolean }) {
    if (verifying) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[var(--border-default)] bg-[var(--bg-raised)] text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking
            </span>
        );
    }
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border font-mono text-[10px] uppercase tracking-[0.12em]",
                verified
                    ? "border-[var(--data-green)]/30 bg-[var(--data-green-muted)] text-[var(--data-green)]"
                    : "border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-tertiary)]",
            )}
        >
            {verified ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {verified ? "Verified" : "Not detected"}
        </span>
    );
}

function FrameworkRow({ name, location }: { name: string; location: string }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-[var(--border-default)]/50 last:border-b-0">
            <div className="text-sm font-medium text-[var(--text-primary)] min-w-[160px] flex-shrink-0">
                {name}
            </div>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed text-right">
                {location}
            </div>
        </div>
    );
}
