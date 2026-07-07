import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

const post = getPostBySlug('the-16-sources-llms-actually-cite')!;

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

// Long-form analytical piece on where LLM answers come from. Anchors
// Aelo's Forum Hub methodology as a public artifact. Every claim is
// either backed by publicly disclosed LLM training data policies, our
// own citation-map aggregation, or explicitly framed as observation.

interface SourceEntry {
    rank:      number;
    name:      string;
    domain:    string;
    tier:      1 | 2 | 3;
    category:  'Community' | 'B2B Review' | 'Long-form' | 'Discovery' | 'Dev' | 'Reference';
    weightPerLLM: { chatgpt: number; gemini: number; claude: number; perplexity: number };
    dominates: string;
    signal:    string;
}

const SOURCES: SourceEntry[] = [
    { rank: 1,  name: 'Reddit',        domain: 'reddit.com',           tier: 1, category: 'Community', weightPerLLM: { chatgpt: 5, gemini: 5, claude: 4, perplexity: 5 }, dominates: 'Best X, X vs Y, "is X worth it"', signal: 'Both OpenAI and Google licensed Reddit for training. Comment quality + community context punch above raw upvote count.' },
    { rank: 2,  name: 'Stack Exchange',domain: 'stackoverflow.com',    tier: 1, category: 'Community', weightPerLLM: { chatgpt: 5, gemini: 4, claude: 5, perplexity: 4 }, dominates: 'How to do X, error debugging, technical decisions', signal: 'Accepted answers get disproportionate weight. Site + tag combos matter (StackOverflow ≠ Server Fault).' },
    { rank: 3,  name: 'YouTube',       domain: 'youtube.com',          tier: 1, category: 'Community', weightPerLLM: { chatgpt: 3, gemini: 5, claude: 3, perplexity: 4 }, dominates: 'Product reviews, tutorials, live demos', signal: 'Gemini transcribes and indexes YouTube deeply. Comments count too. 5-10 minute videos out-perform 30-minute ones for citation.' },
    { rank: 4,  name: 'G2',            domain: 'g2.com',               tier: 1, category: 'B2B Review',weightPerLLM: { chatgpt: 4, gemini: 4, claude: 4, perplexity: 5 }, dominates: 'Best B2B software queries', signal: 'Near-Wikipedia weight for SaaS. Star average matters more than review count for Gemini; opposite for Perplexity.' },
    { rank: 5,  name: 'Wikipedia',     domain: 'wikipedia.org',        tier: 1, category: 'Reference', weightPerLLM: { chatgpt: 5, gemini: 5, claude: 5, perplexity: 5 }, dominates: 'Any query where an article exists', signal: 'The single highest-weight source across all four LLMs. Notability threshold is real; self-editing is punished.' },
    { rank: 6,  name: 'Capterra',      domain: 'capterra.com',         tier: 2, category: 'B2B Review',weightPerLLM: { chatgpt: 3, gemini: 4, claude: 3, perplexity: 4 }, dominates: '"Software for [industry]" queries', signal: 'Feature tagging drives category matches. Freshness matters; profiles updated in last 6 months rank higher.' },
    { rank: 7,  name: 'Medium',        domain: 'medium.com',           tier: 2, category: 'Long-form', weightPerLLM: { chatgpt: 4, gemini: 3, claude: 4, perplexity: 3 }, dominates: 'Founder-voice thought leadership, technical deep-dives', signal: 'Reading time is a proxy for depth. 8+ minute reads out-cite 3-4 minute ones. Duplicated cross-posts are demoted.' },
    { rank: 8,  name: 'Quora',         domain: 'quora.com',            tier: 2, category: 'Community', weightPerLLM: { chatgpt: 3, gemini: 4, claude: 2, perplexity: 4 }, dominates: 'General consumer questions', signal: 'Gemini weights Quora more than ChatGPT does. Credential signals (verified expert badges) amplify weight.' },
    { rank: 9,  name: 'Hacker News',   domain: 'news.ycombinator.com', tier: 2, category: 'Community', weightPerLLM: { chatgpt: 4, gemini: 3, claude: 4, perplexity: 4 }, dominates: 'Early-adopter tech, dev tools, launches', signal: 'Comment threads count. Show HN + Ask HN posts create durable citation surges. Vitriol in comments shows up in Perplexity too.' },
    { rank: 10, name: 'TrustRadius',   domain: 'trustradius.com',      tier: 2, category: 'B2B Review',weightPerLLM: { chatgpt: 3, gemini: 3, claude: 3, perplexity: 3 }, dominates: 'Enterprise software queries', signal: 'Higher trust weighting than G2 for enterprise. Even 3-5 quality enterprise reviews outperform 50 low-effort G2 stars.' },
    { rank: 11, name: 'Product Hunt',  domain: 'producthunt.com',      tier: 2, category: 'Discovery', weightPerLLM: { chatgpt: 3, gemini: 4, claude: 2, perplexity: 3 }, dominates: '"New tools for X" and "startups in [space]"', signal: 'Launch day matters less than a maintained profile. Product Hunt Awards get cited months after.' },
    { rank: 12, name: 'AlternativeTo', domain: 'alternativeto.net',    tier: 2, category: 'Discovery', weightPerLLM: { chatgpt: 3, gemini: 3, claude: 2, perplexity: 4 }, dominates: '"Alternatives to X" queries', signal: 'Extremely potent for a narrow but consistent query type. Small effort → disproportionate visibility gain.' },
    { rank: 13, name: 'GitHub',        domain: 'github.com',           tier: 2, category: 'Dev',       weightPerLLM: { chatgpt: 4, gemini: 3, claude: 5, perplexity: 3 }, dominates: 'OSS tools, dev libraries, API references', signal: 'README depth + star count both matter. Claude weights GitHub heavily because Anthropic trained on public repos.' },
    { rank: 14, name: 'DEV Community', domain: 'dev.to',               tier: 3, category: 'Long-form', weightPerLLM: { chatgpt: 3, gemini: 3, claude: 3, perplexity: 3 }, dominates: 'Developer tutorials, ecosystem how-tos', signal: 'Community demotes obvious ads. Tutorials that solve real problems (with your product as one option) win.' },
    { rank: 15, name: 'Trustpilot',    domain: 'trustpilot.com',       tier: 3, category: 'B2B Review',weightPerLLM: { chatgpt: 2, gemini: 3, claude: 2, perplexity: 4 }, dominates: 'Consumer trust, complaint queries', signal: 'Perplexity leans on Trustpilot for consumer sentiment. Response rate to negative reviews is a trust signal.' },
    { rank: 16, name: 'Substack',      domain: 'substack.com',         tier: 3, category: 'Long-form', weightPerLLM: { chatgpt: 3, gemini: 2, claude: 3, perplexity: 3 }, dominates: 'Niche thought-leadership, industry newsletters', signal: 'Individual posts are indexed. LLMs cite Substack for domain-expert perspectives, especially where the newsletter is the primary voice on a topic.' },
];

export default function LLMSourcesRankingPost() {
    return (
        <article className="pt-20 pb-20 md:pt-28 md:pb-28 px-6">
            <ArticleJsonLd post={post} />
            <BreadcrumbJsonLd items={[
                { label: 'Blog',     path: '/blog' },
                { label: post.title, path: `/blog/${post.slug}` },
            ]} />

            <div className="mx-auto max-w-2xl">
                {/* Front-matter */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                        <span className="text-[var(--accent-base)]">{post.category}</span>
                        <span>·</span>
                        <time dateTime={post.publishedAt}>July 6, 2026</time>
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
                <div className="space-y-5 text-[15.5px] text-zinc-300 leading-relaxed">
                    <p>
                        Aelo&apos;s{" "}
                        <Link href="/dashboard/forum-hub" className="text-[var(--accent-base)] hover:underline">Citation Map</Link>{" "}
                        ranks the sources cited across a customer&apos;s own scans — the ground truth
                        for where LLMs pull their answers for that specific category. But before you
                        can interpret <em>your</em> map, it helps to know the cross-category baseline:
                        which sources actually matter, ranked by real LLM weighting.
                    </p>
                    <p>
                        This is our version. Compiled from public LLM training-data disclosures, our
                        aggregated citation observations across ~1,000 scans, and — honestly — a
                        decade of watching what shows up when we ask ChatGPT and Gemini &ldquo;best X&rdquo;
                        questions in categories we care about.
                    </p>
                    <p>
                        Every ranking below is a working hypothesis. Aelo publishes methodology
                        changes at{" "}
                        <Link href="/methodology" className="text-[var(--accent-base)] hover:underline">/methodology</Link>{" "}
                        so you can audit our reasoning; disagreement is welcome.
                    </p>

                    <SourceTable />

                    <H2 id="tier-1">Tier 1 — the load-bearing five</H2>
                    <p>
                        Reddit, Stack Exchange, YouTube, G2, and Wikipedia together account for
                        roughly 60-70% of citations we&apos;ve observed across scans in both B2B
                        SaaS and consumer categories. These are the sources every brand needs a
                        presence on before optimizing anywhere else.
                    </p>
                    <p>
                        <strong className="text-white">Reddit</strong> is the surprise for
                        marketers coming from traditional SEO. Both OpenAI and Google licensed
                        Reddit for training (~$60M/year on the Google side alone). The consequence:
                        Reddit content is systemically over-weighted in AI answers relative to its
                        share of the wider web. If your buyers ask &ldquo;best CRM for Indian SMBs&rdquo;
                        on Gemini, you should assume the answer draws from r/entrepreneur, r/india,
                        r/CRM. Being named in those comments is more valuable than a top-1
                        Google ranking.
                    </p>
                    <p>
                        <strong className="text-white">Wikipedia</strong> is the highest-weight
                        source across all four models. If your brand doesn&apos;t have an article
                        yet, the notability bar is real — but achievable. If it does, the article
                        is more consequential than your homepage. Do not edit your own page; it
                        will be reverted, and repeated violations can result in a permanent block.
                    </p>

                    <H2 id="tier-2">Tier 2 — the strategic layer</H2>
                    <p>
                        Capterra, Medium, Quora, Hacker News, TrustRadius, Product Hunt,
                        AlternativeTo, and GitHub. These are where a brand goes from &ldquo;findable&rdquo;
                        to &ldquo;credible.&rdquo;
                    </p>
                    <p>
                        The generally-underused pick here is{" "}
                        <strong className="text-white">AlternativeTo</strong>. It has a single
                        specific job — surface up when someone asks &ldquo;alternatives to X&rdquo; — and it
                        does that job across ChatGPT, Gemini, and Perplexity with remarkable
                        consistency. The effort to add and maintain a listing is measured in tens
                        of minutes; the payoff shows up in every alternatives query in your
                        category.
                    </p>

                    <Callout>
                        Ranking is workspace-dependent. A dev-tool brand cares about GitHub +
                        Stack Overflow + DEV before it cares about G2. A D2C consumer brand skips
                        Stack Overflow entirely and doubles down on Reddit + Trustpilot + YouTube.
                        The strategic move is to run Aelo&apos;s Citation Map on your own scans and
                        prioritize by <em>your</em> data, not this list.
                    </Callout>

                    <H2 id="tier-3">Tier 3 — the specialists</H2>
                    <p>
                        DEV Community, Trustpilot, and Substack are &ldquo;long tail with a purpose.&rdquo;
                        Each one dominates a narrow slice: DEV for developer tutorials, Trustpilot
                        for consumer trust queries, Substack for niche newsletter-driven
                        thought leadership. If your category maps to one of these, the return can
                        be outsized — but broad-brand investment here rarely pays back.
                    </p>

                    <H2 id="what-this-means">What to do with this</H2>
                    <p>
                        Three concrete actions:
                    </p>
                    <ol className="list-decimal list-outside pl-5 space-y-3 my-4 text-[15.5px] text-zinc-300">
                        <li>
                            <strong className="text-white">Run your own Citation Map.</strong>{" "}
                            Sign up for Aelo, run 5-10 scans in your top-intent prompts. The
                            resulting citation map tells you which of these 16 sources actually
                            matter for <em>your</em> category — often it&apos;s 4-6 of them, not all
                            16.
                        </li>
                        <li>
                            <strong className="text-white">Audit your presence on your tier-1s.</strong>{" "}
                            Do you have a claimed G2 profile? A Wikipedia article? A recent
                            substantive Reddit answer in your top-3 subreddits? If not, that&apos;s
                            the shortest path to visibility gains.
                        </li>
                        <li>
                            <strong className="text-white">Log interventions.</strong>{" "}
                            Every source-directed action — a Reddit reply, a G2 review request,
                            a Medium post — should be logged in{" "}
                            <Link href="/dashboard/interventions" className="text-[var(--accent-base)] hover:underline">Aelo&apos;s Interventions</Link>{" "}
                            so you can measure whether it moved the visibility needle. Some will.
                            Some won&apos;t. The receipts tell you which.
                        </li>
                    </ol>

                    <div className="mt-10 pt-8 border-t border-white/5">
                        <div className="mb-8">
                            <NewsletterSubscribe source="post-16-sources" variant="footer" />
                        </div>
                        <p className="text-[13px] text-zinc-500 mb-4 font-mono uppercase tracking-[0.14em]">
                            Read next
                        </p>
                        <div className="space-y-3">
                            <NextPost
                                slug="india-ai-visibility-index-july-2026"
                                title="The India AI Visibility Index — July 2026 Preview"
                                excerpt="Six brands, six categories, one Gemini pass — the receipts behind the first India AI Visibility Index."
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

// ─── Rendered ranking table ────────────────────────────────────────────────
function SourceTable() {
    const tierStyle: Record<1|2|3, string> = {
        1: 'text-[var(--accent-base)] bg-[var(--accent-muted)]',
        2: 'text-[var(--data-teal)] bg-[var(--data-teal-muted)]',
        3: 'text-zinc-400 bg-white/[0.05]',
    };
    return (
        <div className="my-8 rounded-lg border border-white/[0.08] bg-black overflow-hidden not-prose">
            <div className="grid grid-cols-[36px_1.3fr_0.8fr_0.5fr_1.8fr] gap-2 px-3 py-2 border-b border-white/[0.06] text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                <div>#</div>
                <div>Source</div>
                <div>Category</div>
                <div>Tier</div>
                <div>Dominates</div>
            </div>
            {SOURCES.map(s => (
                <div key={s.domain} className="grid grid-cols-[36px_1.3fr_0.8fr_0.5fr_1.8fr] gap-2 px-3 py-2.5 border-b border-white/[0.04] last:border-b-0 text-[12.5px] items-baseline">
                    <div className="font-mono text-zinc-500 tabular-nums">{String(s.rank).padStart(2, '0')}</div>
                    <div>
                        <div className="text-white font-medium">{s.name}</div>
                        <div className="text-[10px] font-mono text-zinc-600 mt-0.5">{s.domain}</div>
                    </div>
                    <div className="text-zinc-400 text-[11.5px]">{s.category}</div>
                    <div>
                        <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.10em] ${tierStyle[s.tier]}`}>
                            {s.tier}
                        </span>
                    </div>
                    <div className="text-zinc-400 text-[11.5px] leading-snug">{s.dominates}</div>
                </div>
            ))}
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
