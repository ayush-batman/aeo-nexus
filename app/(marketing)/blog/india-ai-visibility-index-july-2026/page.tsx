import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

const post = getPostBySlug('india-ai-visibility-index-july-2026')!;

export const metadata: Metadata = {
    title: post.title,
    description: post.excerpt,
    openGraph: {
        title: post.title,
        description: post.excerpt,
        type: 'article',
        publishedTime: post.publishedAt,
        authors: [post.author],
    },
};

// Flagship post — first substantive edition of the India Visibility Index.
// Every claim in the body links back to /india-index or /methodology so a
// skeptical reader can audit the numbers in one click.

export default function IndiaIndexJuly2026Post() {
    return (
        <article className="pt-20 pb-20 md:pt-28 md:pb-28 px-6">
            <ArticleJsonLd post={post} />
            <BreadcrumbJsonLd items={[
                { label: 'Blog',           path: '/blog' },
                { label: post.title,       path: `/blog/${post.slug}` },
            ]} />
            <div className="mx-auto max-w-2xl">
                {/* Front-matter */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                        <span className="text-[var(--accent-base)]">{post.category}</span>
                        <span>·</span>
                        <time dateTime={post.publishedAt}>July 5, 2026</time>
                        <span>·</span>
                        <span>{post.readingTime}</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4 text-balance">
                        {post.title}
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 leading-relaxed">
                        {post.excerpt}
                    </p>
                    <p className="mt-4 text-[12px] font-mono text-zinc-600">
                        By {post.author}
                    </p>
                </div>

                {/* Body */}
                <div className="prose-body space-y-5 text-[15.5px] text-zinc-300 leading-relaxed">
                    <p>
                        This is the first edition of the <Link href="/india-index" className="text-[var(--accent-base)] hover:underline">India AI Visibility Index</Link> —
                        a monthly measurement of how Gemini (and, from August, ChatGPT + Claude +
                        Perplexity) actually answer high-intent questions in India&apos;s biggest
                        categories.
                    </p>
                    <p>
                        Every number in the ranking below is one click away from the raw scan
                        that produced it. Every response text is verbatim from Gemini. Nothing
                        is smoothed, averaged across platforms, or scored by another LLM.
                        You can reproduce any single line yourself in 30 seconds by pasting
                        the prompt into Gemini and reading the answer.
                    </p>

                    <RankingSummary />

                    <H2 id="the-headline">The headline: Zoho dominates SaaS. Byju&apos;s doesn&apos;t exist.</H2>
                    <p>
                        The single most striking result of this edition is the gap between
                        <strong className="text-white"> #1 Zoho</strong> and <strong className="text-white">#6 Byju&apos;s</strong>.
                    </p>
                    <p>
                        For both prompts we tested Zoho against — &ldquo;Best CRM for Indian SMBs
                        in 2026&rdquo; and &ldquo;Cheapest business email hosting for startups&rdquo; — Gemini
                        named Zoho positively. On the second query it named Zoho <em>first</em>,
                        ahead of Google Workspace and Microsoft 365. That&apos;s a <strong className="text-white">100% mention rate at position #1</strong> in
                        a category where Google and Microsoft are the incumbent giants. It&apos;s
                        the strongest result in the Index.
                    </p>
                    <p>
                        For the two Byju&apos;s prompts — &ldquo;Best edtech app for CBSE class 10&rdquo; and
                        &ldquo;Best JEE preparation online in India&rdquo; — Gemini did <em>not name Byju&apos;s once</em>.
                        Not in the top ten. Not in the also-rans. Not at all. India&apos;s
                        best-funded EdTech company, once valued at $22B, is invisible to the AI
                        answer layer for the exact queries its future customers are asking.
                    </p>
                    <p>
                        That&apos;s not a rendering issue or a caching problem. Try it yourself:
                        open Gemini, paste the prompt, read the answer. The Index simply
                        surfaces what any prospective buyer would see.
                    </p>

                    <Callout>
                        The India Index doesn&apos;t predict outcomes. It measures what Gemini
                        actually says right now. What each brand does with that information is
                        the interesting part.
                    </Callout>

                    <H2 id="fintech-split">Fintech: strong presence, positional gap</H2>
                    <p>
                        Zerodha and Razorpay are both categorized as <strong className="text-white">Strong</strong> — 100% and
                        67% mention rates respectively — but there&apos;s a meaningful difference
                        in how Gemini <em>positions</em> them within its answers.
                    </p>
                    <ul className="list-none space-y-2 pl-0">
                        <BulletFact
                            brand="Zerodha"
                            fact="Named for both stockbroker queries but at position #5.5 average — usually the fifth or sixth name in the list. Present but not top-of-mind."
                        />
                        <BulletFact
                            brand="Razorpay"
                            fact="Named for 2 of 3 payments-adjacent queries, average position #2. When Gemini talks about Indian payment gateways, Razorpay is one of the first names it reaches for."
                        />
                    </ul>
                    <p>
                        Position matters more than most brands assume. The AI answer isn&apos;t a
                        SERP — users don&apos;t scroll past position #3. Being named at all is
                        table stakes; being named <em>early</em> is the actual win. Razorpay
                        is closer to winning than Zerodha, despite Zerodha&apos;s higher mention
                        rate.
                    </p>

                    <H2 id="d2c">D2C: BoAt strong, Mamaearth contested</H2>
                    <p>
                        BoAt scores <strong className="text-white">Strong</strong> (67% mention, position #2.5), Mamaearth
                        scores <strong className="text-white">Contested</strong> (50% mention, position #1 when
                        mentioned). Interesting split: when Gemini mentions Mamaearth, it
                        <em>leads</em> with it — but it only mentions Mamaearth half the time
                        for the tested category queries. That&apos;s a coverage problem, not a
                        positioning one.
                    </p>

                    <H2 id="methodology-note">A note on methodology</H2>
                    <p>
                        This preview edition is Gemini-only. It samples 2 prompts per brand,
                        selected as category-representative Indian intent queries. Verdict
                        tiers use strict thresholds (Dominant ≥ 90% + pos ≤ 2, Strong ≥ 60%,
                        Contested ≥ 1%, Invisible = 0%). No smoothing, no LLM-as-judge, no
                        averaging across platforms. The full formula sheet lives at{" "}
                        <Link href="/methodology" className="text-[var(--accent-base)] hover:underline">
                            aelo.sh/methodology
                        </Link>.
                    </p>
                    <p>
                        <strong className="text-white">The August edition will be bigger.</strong> Four platforms (ChatGPT + Claude
                        + Perplexity + Gemini), 30–50 brands, 4–6 prompts per brand. We&apos;ll
                        publish it on the first Monday of August alongside a full-length
                        analysis in this same format.
                    </p>

                    <H2 id="how-to-be-included">How to be included in the August edition</H2>
                    <p>
                        Two paths:
                    </p>
                    <ul className="list-none space-y-2 pl-0">
                        <li className="rounded-md border border-white/[0.06] bg-black p-4">
                            <strong className="text-white block mb-1">Apply publicly</strong>
                            <span className="text-[14px] text-zinc-400">
                                Nominate your brand (or one you follow) via the{" "}
                                <Link href="/contact?interest=india-index" className="text-[var(--accent-base)] hover:underline">
                                    India Index inclusion form
                                </Link>. Featured brands get a free month of Aelo Command to see
                                per-prompt gaps.
                            </span>
                        </li>
                        <li className="rounded-md border border-white/[0.06] bg-black p-4">
                            <strong className="text-white block mb-1">Sign up as an Aelo customer</strong>
                            <span className="text-[14px] text-zinc-400">
                                Every Command workspace is automatically eligible for the
                                Index in its own category. Radar tier costs less than a lunch.
                                See <Link href="/pricing" className="text-[var(--accent-base)] hover:underline">pricing</Link>.
                            </span>
                        </li>
                    </ul>

                    <div className="mt-10 pt-8 border-t border-white/5">
                        <div className="mb-8">
                            <NewsletterSubscribe source="post-india-index-2026-07" variant="footer" />
                        </div>
                        <p className="text-[13px] text-zinc-500 mb-4 font-mono uppercase tracking-[0.14em]">
                            Read next
                        </p>
                        <div className="space-y-3">
                            <NextPost
                                slug="why-zero-is-honest"
                                title="Why zero is honest"
                                excerpt="Every AI-visibility tool wants to show you a nice green number. Aelo will show you a zero if that's what the LLMs said."
                            />
                            <NextPost
                                slug="the-receipt-is-the-product"
                                title="The receipt is the product"
                                excerpt="Every derived number in Aelo is one click away from the raw scan. This isn't a feature — it's the entire thesis."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}

// ── Ranking summary component (renders the 6-brand table inline) ────────────
function RankingSummary() {
    const rows: { rank: number; brand: string; category: string; mention: number; pos: string; verdict: 'dominant'|'strong'|'contested'|'invisible' }[] = [
        { rank: 1, brand: 'Zoho',      category: 'SaaS',    mention: 100, pos: '#1',   verdict: 'dominant' },
        { rank: 2, brand: 'Zerodha',   category: 'Fintech', mention: 100, pos: '#5.5', verdict: 'strong' },
        { rank: 3, brand: 'Razorpay',  category: 'Fintech', mention: 67,  pos: '#2',   verdict: 'strong' },
        { rank: 4, brand: 'BoAt',      category: 'D2C',     mention: 67,  pos: '#2.5', verdict: 'strong' },
        { rank: 5, brand: 'Mamaearth', category: 'D2C',     mention: 50,  pos: '#1',   verdict: 'contested' },
        { rank: 6, brand: "Byju's",    category: 'EdTech',  mention: 0,   pos: '—',    verdict: 'invisible' },
    ];
    const verdictStyle: Record<string, string> = {
        dominant:  'text-[var(--accent-base)] bg-[var(--accent-muted)]',
        strong:    'text-[var(--data-green)] bg-[var(--data-green-muted)]',
        contested: 'text-[var(--data-amber)] bg-[var(--data-amber-muted)]',
        invisible: 'text-[var(--data-red)] bg-[var(--data-red-muted)]',
    };
    return (
        <div className="my-8 rounded-lg border border-white/[0.08] bg-black overflow-hidden not-prose">
            <div className="grid grid-cols-[36px_1.4fr_0.9fr_0.9fr_0.6fr_1fr] gap-2 px-3 py-2 border-b border-white/[0.06] text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                <div>#</div><div>Brand</div><div>Category</div><div className="text-right">Mention</div><div className="text-right">Pos</div><div>Verdict</div>
            </div>
            {rows.map(r => (
                <div key={r.brand} className="grid grid-cols-[36px_1.4fr_0.9fr_0.9fr_0.6fr_1fr] gap-2 px-3 py-2.5 border-b border-white/[0.04] last:border-b-0 text-[13px] items-center">
                    <div className="font-mono text-zinc-500 tabular-nums">{String(r.rank).padStart(2, '0')}</div>
                    <div className="text-white font-medium">{r.brand}</div>
                    <div className="text-zinc-400">{r.category}</div>
                    <div className="text-right text-white font-medium tabular-nums">{r.mention}%</div>
                    <div className="text-right text-zinc-300 tabular-nums">{r.pos}</div>
                    <div>
                        <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.10em] ${verdictStyle[r.verdict]}`}>
                            {r.verdict}
                        </span>
                    </div>
                </div>
            ))}
            <div className="px-3 py-2 border-t border-white/[0.06] bg-[#040405] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                <span>Preview edition · Gemini only · 2 prompts / brand</span>
                <Link href="/india-index" className="text-[var(--accent-base)] hover:underline inline-flex items-center gap-1">
                    See the live receipts <ExternalLink className="w-2.5 h-2.5" />
                </Link>
            </div>
        </div>
    );
}

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
    return (
        <h2 id={id} className="text-xl md:text-2xl font-medium tracking-tight text-white mt-10 mb-3 scroll-mt-24">
            {children}
        </h2>
    );
}

function Callout({ children }: { children: React.ReactNode }) {
    return (
        <div className="my-6 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[14.5px] text-zinc-200 leading-relaxed italic">
            {children}
        </div>
    );
}

function BulletFact({ brand, fact }: { brand: string; fact: string }) {
    return (
        <li className="grid grid-cols-[110px_1fr] gap-3 py-2 border-b border-white/[0.05] last:border-b-0">
            <div className="text-[13px] font-medium text-white">{brand}</div>
            <div className="text-[13.5px] text-zinc-400 leading-relaxed">{fact}</div>
        </li>
    );
}

function NextPost({ slug, title, excerpt }: { slug: string; title: string; excerpt: string }) {
    return (
        <Link
            href={`/blog/${slug}`}
            className="block rounded-md border border-white/[0.06] bg-black hover:border-[var(--accent-base)]/40 transition-colors p-4 group"
        >
            <div className="text-[14.5px] font-medium text-white mb-1 group-hover:text-[var(--accent-base)] transition-colors flex items-center justify-between">
                {title}
                <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="text-[13px] text-zinc-500 leading-relaxed">{excerpt}</div>
        </Link>
    );
}
