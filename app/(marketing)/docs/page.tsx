import Link from "next/link";
import { ArrowRight, Zap, Search, ClipboardList, CheckCircle2, Code, Radio, BookOpen, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Docs · Aelo",
    description: "Install the pixel. Run your first scan. Read your first receipt. Everything you need to start winning AI answers.",
};

// Docs page — real, actionable content. Sage rule: no fluff, no
// "coming soon" placeholders in the primary flow. FAQ + reference sit
// alongside the quickstart so a developer can copy-paste and go.

const QUICKSTART = [
    { icon: Zap,           title: "Create your workspace",   body: "Sign up (no card). Auto-onboarding provisions your first workspace with sensible defaults. Add your website and top 3 competitors in the first minute — the analyzer uses them to categorize citations correctly." },
    { icon: Search,        title: "Add target prompts",      body: "LLM Tracker → Add prompts. Aelo seeds 30+ high-intent queries for your category. Edit, star, or add your own. Every scheduled scan runs against every starred prompt." },
    { icon: ClipboardList, title: "Run your first scan",    body: "Click Run scan. Aelo hits Gemini live (Radar tier) or all four providers in parallel (Command). Analyzer extracts mention state, position, sentiment, competitors, and citations. Zero fabrication — a failed provider surfaces a real error, never a mock." },
    { icon: CheckCircle2,  title: "Log your first intervention", body: "Ship something — a landing page, a Reddit reply, a schema block. Log it in /dashboard/interventions with the target prompt(s) it should move. Aelo snapshots a baseline at that moment. Hit Measure a week later to see the receipt." },
];

const FAQ = [
    { q: "How is Aelo different from ChatGPT SEO tools?",  a: "Most tools ship a black-box 'AI Score' averaged across platforms. Aelo shows per-platform per-prompt receipts you can reproduce yourself in 30 seconds. See /methodology for every formula." },
    { q: "Does the pixel slow down my site?",              a: "The script is ~3 KB gzipped, loaded async, and fires a single beacon per pageview. No render-blocking, no cookies. See the Event API below for the exact wire format." },
    { q: "Which LLMs does Aelo scan?",                     a: "Gemini and Google AI Overview on Radar. ChatGPT, Gemini, Claude, and Perplexity on Command. Same prompt runs on every enabled platform in parallel, then each response is analyzed independently — no cross-platform averaging unless you ask for it." },
    { q: "What happens when an LLM API is down?",          a: "The failed scan is logged with the actual error, tagged failed, and excluded from all metrics. It does not become a 'zero' or 'not mentioned' data point. Failures are visible in the receipt drawer." },
    { q: "Can I export my scan data?",                     a: "Yes — every workspace can export every scan as CSV or JSON from Settings → Data. Nothing about a metric is proprietary; take the receipts with you if you leave." },
    { q: "How much does the pixel cost me on the LLM side?", a: "Nothing — the pixel captures pageviews on your site. LLM scans are billed against Aelo's plan. Your visitors never trigger an LLM call." },
];

export default function DocsPage() {
    return (
        <>
            {/* Hero */}
            <section className="pt-20 pb-12 md:pt-28 md:pb-16 px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        Docs · v1
                    </p>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4 text-balance">
                        From signup to your first receipt in under 10 minutes.
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 max-w-2xl leading-relaxed">
                        Everything you need to install Aelo, capture your first scans, and start
                        acting on the answers. Prefer to see the formulas behind the numbers?{" "}
                        <Link href="/methodology" className="text-[var(--accent-base)] hover:underline">
                            Read the methodology
                        </Link>.
                    </p>
                </div>
            </section>

            {/* Table of contents */}
            <section className="pb-6 px-6">
                <div className="mx-auto max-w-3xl flex flex-wrap gap-2 border-y border-white/5 py-4">
                    <TocLink href="#quickstart"  label="Quickstart" />
                    <TocLink href="#install"     label="Install the pixel" />
                    <TocLink href="#events"      label="Event API" />
                    <TocLink href="#scan-api"    label="Scan API" />
                    <TocLink href="#concepts"    label="Core concepts" />
                    <TocLink href="#faq"         label="FAQ" />
                </div>
            </section>

            {/* Quickstart */}
            <section id="quickstart" className="pb-16 px-6 scroll-mt-24">
                <div className="mx-auto max-w-3xl">
                    <SectionHeading icon={Zap} eyebrow="01" title="Quickstart" />
                    <div className="space-y-3">
                        {QUICKSTART.map((s, i) => (
                            <div key={i} className="rounded-lg border border-white/[0.06] bg-black p-5 flex gap-4">
                                <div className="flex-shrink-0 w-9 h-9 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center text-white">
                                    <s.icon className="w-4 h-4" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <div className="text-[15px] font-medium text-white tracking-tight mb-1.5">
                                        {i + 1}. {s.title}
                                    </div>
                                    <div className="text-[13px] text-zinc-400 leading-relaxed">
                                        {s.body}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Install the pixel */}
            <section id="install" className="py-16 border-t border-white/5 bg-[#050506] px-6 scroll-mt-24">
                <div className="mx-auto max-w-3xl">
                    <SectionHeading icon={Code} eyebrow="02" title="Install the pixel" />
                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-6">
                        The Aelo pixel is a single async script that measures which AI referrers
                        drive real visits — ChatGPT.com, Perplexity, Gemini, Claude, and Google AI
                        Overview all set identifiable referrers, and the pixel classifies them
                        for you.
                    </p>

                    <SubHeading>Basic install</SubHeading>
                    <CodeBlock>{`<script
  id="aeo-pixel"
  src="https://aelohq.com/aelo-pixel.js"
  data-workspace-id="YOUR_WORKSPACE_ID"
  async
></script>`}</CodeBlock>
                    <p className="text-[13px] text-zinc-500 leading-relaxed mb-6">
                        Paste before <Mono>{`</head>`}</Mono>. Grab the workspace-personalized
                        snippet from <Link href="/dashboard/settings?tab=install" className="text-[var(--accent-base)] hover:underline">Settings → Install</Link>{" "}
                        — the workspace ID is filled in for you and the tab shows a live
                        verification badge that flips to VERIFIED the moment the first pageview
                        arrives.
                    </p>

                    <SubHeading>Framework-specific placement</SubHeading>
                    <div className="rounded-md border border-white/[0.06] bg-black overflow-hidden mb-6">
                        {[
                            { fw: "Next.js (App Router)",  loc: <>Add to <Mono>app/layout.tsx</Mono> inside <Mono>{'<head>'}</Mono>, or use <Mono>next/script</Mono> with <Mono>strategy=&quot;afterInteractive&quot;</Mono>.</> },
                            { fw: "Next.js (Pages Router)",loc: <>Add to <Mono>pages/_document.tsx</Mono> inside <Mono>{'<Head>'}</Mono>.</> },
                            { fw: "React / Vite / CRA",    loc: <>Add to <Mono>public/index.html</Mono>.</> },
                            { fw: "Webflow / Framer",       loc: <>Site Settings → Custom Code → Head Code.</> },
                            { fw: "Shopify",               loc: <>Themes → Edit code → <Mono>theme.liquid</Mono>.</> },
                            { fw: "WordPress",             loc: <>Theme File Editor → <Mono>header.php</Mono>, or use a plugin like Insert Headers and Footers.</> },
                        ].map((row, i) => (
                            <div key={i} className="grid grid-cols-[180px_1fr] gap-4 px-4 py-3 border-b border-white/[0.04] last:border-b-0 text-[13px]">
                                <div className="text-white font-medium">{row.fw}</div>
                                <div className="text-zinc-500 leading-relaxed">{row.loc}</div>
                            </div>
                        ))}
                    </div>

                    <SubHeading>What the pixel sends</SubHeading>
                    <CodeBlock>{`POST https://aelohq.com/api/analytics/track
Content-Type: application/json

{
  "workspaceId": "wsp_XYZ",
  "eventType":   "pageview",
  "url":         "https://your-site.com/pricing",
  "referrer":    "https://chatgpt.com/",
  "aiSource":    "chatgpt",         // null when not from an AI referrer
  "userAgent":   "Mozilla/5.0 …",
  "timestamp":   "2026-07-05T14:23:15Z"
}`}</CodeBlock>
                    <p className="text-[13px] text-zinc-500 leading-relaxed">
                        No cookies. No fingerprinting. No personal data. Just enough to know which
                        LLM sent the visitor and what page they landed on.
                    </p>
                </div>
            </section>

            {/* Event API */}
            <section id="events" className="py-16 border-t border-white/5 px-6 scroll-mt-24">
                <div className="mx-auto max-w-3xl">
                    <SectionHeading icon={Radio} eyebrow="03" title="Custom events" />
                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-6">
                        The pixel exposes <Mono>window.aelo.track()</Mono> so you can log key
                        conversion events with the AI-source attribution attached. Signups,
                        purchases, form submits, whatever you want to close the attribution loop on.
                    </p>

                    <SubHeading>Fire a custom event</SubHeading>
                    <CodeBlock>{`window.aelo?.track("signup", {
  plan: "command",
  ltv:  4900,          // your own custom fields, freeform
});`}</CodeBlock>

                    <SubHeading>Shape of the payload sent to Aelo</SubHeading>
                    <CodeBlock>{`{
  "workspaceId": "wsp_XYZ",
  "eventType":   "signup",           // your event name
  "aiSource":    "chatgpt",          // hydrated from initial pageview
  "metadata":    { "plan": "command", "ltv": 4900 },
  "timestamp":   "2026-07-05T14:23:47Z"
}`}</CodeBlock>
                    <p className="text-[13px] text-zinc-500 leading-relaxed">
                        Events attributed to an AI referrer show up in{" "}
                        <Link href="/dashboard/attribution" className="text-[var(--accent-base)] hover:underline">Dashboard → Attribution</Link>{" "}
                        alongside pageviews.
                    </p>
                </div>
            </section>

            {/* Scan API */}
            <section id="scan-api" className="py-16 border-t border-white/5 bg-[#050506] px-6 scroll-mt-24">
                <div className="mx-auto max-w-3xl">
                    <SectionHeading icon={Code} eyebrow="04" title="Scan API" />
                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-6">
                        Programmatic access to run scans and pull receipts. Get an API key from{" "}
                        <Link href="/dashboard/settings?tab=api" className="text-[var(--accent-base)] hover:underline">Settings → API Keys</Link>.
                    </p>

                    <SubHeading>Run a scan</SubHeading>
                    <CodeBlock>{`POST https://aelohq.com/api/llm/scans
Authorization: Bearer aelo_sk_...

{
  "prompt":     "Best CRM for Indian SMBs in 2026",
  "brandName":  "Zoho",
  "brandDomain":"zoho.com",
  "platforms":  ["gemini", "chatgpt"],
  "competitors":["Freshworks", "HubSpot", "Salesforce"]
}`}</CodeBlock>

                    <SubHeading>List recent scans</SubHeading>
                    <CodeBlock>{`GET https://aelohq.com/api/llm/scans?limit=50&platform=gemini
Authorization: Bearer aelo_sk_...`}</CodeBlock>

                    <p className="text-[13px] text-zinc-500 leading-relaxed">
                        All scan endpoints are rate-limited (20 requests / hour / API key on
                        Command). Failed scans return a real error surface (429, 5xx, etc.) — never
                        a mock success. Full response schema is documented in{" "}
                        <a href="https://github.com/ayush-batman/aeo-nexus" target="_blank" rel="noreferrer" className="text-[var(--accent-base)] hover:underline">
                            the API repo
                        </a>.
                    </p>
                </div>
            </section>

            {/* Concepts */}
            <section id="concepts" className="py-16 border-t border-white/5 px-6 scroll-mt-24">
                <div className="mx-auto max-w-3xl">
                    <SectionHeading icon={BookOpen} eyebrow="05" title="Core concepts" />
                    <div className="space-y-2">
                        <ConceptRow term="Mention rate" def="Percentage of tested prompts in which the AI named your brand. Deterministic string match; no LLM-as-judge." />
                        <ConceptRow term="Average position" def="When named, how early in the AI's list. Position 1.0 = first mentioned. Scans where brand wasn't named are excluded from the average (not counted as ∞)." />
                        <ConceptRow term="Health score / 100" def="Composite of mention rate (weighted 70%) and position boost (30%). 0 = never mentioned; 100 = named first every time. Formula on /methodology." />
                        <ConceptRow term="Share of Voice" def="Your mentions as a fraction of all named brands in your competitor set. Requires competitor list configured; otherwise displays '—'." />
                        <ConceptRow term="Receipt" def="The raw scan behind any metric — prompt sent, LLM response received, timestamp. Every derived number in Aelo is one click away from its receipt." />
                        <ConceptRow term="Intervention" def="Something you did to improve visibility (a landing page, a Reddit reply, a schema block). Aelo snapshots a baseline when logged; Measure a week later to see the lift." />
                    </div>
                    <div className="mt-6">
                        <Link href="/methodology" className="text-[13px] text-[var(--accent-base)] hover:underline inline-flex items-center gap-1">
                            Read all the formulas <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-16 border-t border-white/5 bg-[#050506] px-6 scroll-mt-24">
                <div className="mx-auto max-w-3xl">
                    <SectionHeading icon={HelpCircle} eyebrow="06" title="FAQ" />
                    <div className="space-y-3">
                        {FAQ.map((item, i) => (
                            <div key={i} className="rounded-md border border-white/[0.06] bg-black p-5">
                                <div className="text-[14px] font-medium text-white mb-1.5">{item.q}</div>
                                <div className="text-[13px] text-zinc-400 leading-relaxed">{item.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Something not covered */}
            <section className="py-12 border-t border-white/5 px-6">
                <div className="mx-auto max-w-3xl rounded-lg border border-white/[0.06] bg-[#050506] p-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2">
                        Something not covered?
                    </p>
                    <p className="text-[14px] text-zinc-400 leading-relaxed">
                        Email us at <span className="font-mono text-zinc-200">docs@aelohq.com</span>.
                        We reply within a day, and every question becomes a doc entry.
                    </p>
                    <div className="mt-4">
                        <Link href="/contact" className="text-[13px] text-[var(--accent-base)] hover:underline inline-flex items-center gap-1">
                            Book a walkthrough <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

function TocLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            className="text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded-sm hover:bg-white/[0.03]"
        >
            {label}
        </a>
    );
}

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: React.ComponentType<{ className?: string }>; eyebrow: string; title: string }) {
    return (
        <div className="mb-6 flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center text-[var(--accent-base)]">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">
                    Section {eyebrow}
                </p>
                <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">{title}</h2>
            </div>
        </div>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-2 mt-4">
            {children}
        </h3>
    );
}

function Mono({ children }: { children: React.ReactNode }) {
    return (
        <code className="font-mono text-[12px] text-zinc-200 bg-white/[0.04] border border-white/5 rounded-sm px-1.5 py-0.5">
            {children}
        </code>
    );
}

function CodeBlock({ children }: { children: string }) {
    return (
        <pre className="mb-4 p-4 rounded-md border border-white/[0.06] bg-[#040405] text-[12px] font-mono text-zinc-200 leading-relaxed whitespace-pre overflow-x-auto">
            {children}
        </pre>
    );
}

function ConceptRow({ term, def }: { term: string; def: string }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-6 py-3 border-b border-white/[0.05] last:border-b-0">
            <div className="text-[13px] font-medium text-white">{term}</div>
            <div className="text-[13px] text-zinc-400 leading-relaxed">{def}</div>
        </div>
    );
}
