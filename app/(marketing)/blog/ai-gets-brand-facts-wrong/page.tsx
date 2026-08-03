import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd, FaqJsonLd } from "@/components/seo/structured-data";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

const post = getPostBySlug('ai-gets-brand-facts-wrong')!;

const FAQS = [
    {
        q: "How often does AI get brand facts wrong?",
        a: "In our test of 26 Indian consumer brands, roughly 18 percent of the checkable factual claims AI made were wrong or outdated. A further three brands were described as an entirely different company that happened to share the name.",
    },
    {
        q: "Why does AI state wrong facts so confidently?",
        a: "Language models are trained to produce fluent, helpful-sounding text, not calibrated uncertainty. They have no internal signal that says 'I am unsure', so a guessed price arrives in the same confident tone as a verified one.",
    },
    {
        q: "Can I correct what AI says about my brand?",
        a: "Not directly. You cannot edit a model's weights. You can update your own site and the high-authority third-party pages models retrieve from, which fixes grounded answers quickly and training-memory answers over the next model generation.",
    },
    {
        q: "How do I check what AI says about my brand?",
        a: "Ask the engines the questions your buyers ask, many times each, and record the answers. Because output is probabilistic, a single check is unreliable. Tools like Aelo automate the sampling and verify each factual claim against your live site.",
    },
];

export const metadata: Metadata = {
    title: post.title,
    description: post.excerpt,
    keywords: ['AI brand accuracy', 'AI hallucination brands', 'what AI says about my brand', 'AI visibility', 'ChatGPT wrong information'],
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.publishedAt, authors: [post.author] },
};

export default function BrandFactsWrongPost() {
    return (
        <article className="pt-20 pb-20 md:pt-28 md:pb-28 px-6">
            <ArticleJsonLd post={post} />
            <FaqJsonLd items={FAQS} />
            <div className="mx-auto max-w-2xl">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                        <span className="text-[var(--accent-base)]">{post.category}</span>
                        <span>·</span>
                        <time dateTime={post.publishedAt}>August 3, 2026</time>
                        <span>·</span>
                        <span>{post.readingTime}</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4 text-balance">
                        {post.title}
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 leading-relaxed">{post.excerpt}</p>
                </div>

                <div className="space-y-5 text-[15.5px] text-zinc-300 leading-relaxed">
                    <p>
                        We asked AI to describe 26 Indian consumer brands, pulled every checkable
                        factual claim it made, and verified each one against the brand&apos;s own live
                        website. Roughly <strong className="text-white">18 percent of those claims were wrong or out of
                        date</strong>. Three of the 26 brands were not merely described inaccurately.
                        They were described as an entirely different company.
                    </p>
                    <p>
                        The industry conversation about AI and brands is almost entirely about
                        presence: are you mentioned, are you recommended, what is your share of
                        voice. That conversation assumes the mention is correct. Our data says that
                        assumption fails about one time in eight.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">What we actually measured</h2>
                    <p>
                        The method was deliberately boring, because boring is what makes it
                        checkable. For each brand we asked the model to describe the company, its
                        pricing, its main products and its key features. We then extracted the
                        specific, verifiable claims from that answer, the kind a buyer would act
                        on, and compared each against the brand&apos;s own website as ground truth. Each
                        claim was marked true, false, outdated, or unverifiable.
                    </p>
                    <p>
                        We excluded anything subjective. &ldquo;Popular among young buyers&rdquo; is not
                        checkable. &ldquo;Starts at 599 rupees&rdquo; is. That leaves a smaller sample than a
                        mention-counting study would produce, but every data point in it means
                        something.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">The finding nobody expects: it is describing a different company</h2>
                    <p>
                        The most striking failures were not hallucinated details. They were cases
                        where the model had confidently retrieved the wrong entity entirely.
                    </p>
                    <p>
                        Asked about <strong className="text-white">Plum</strong>, the Indian skincare
                        brand, the model produced a fluent, detailed and completely accurate
                        description of Plum, the UK fintech company.{" "}
                        <strong className="text-white">Snitch</strong>, the men&apos;s fashion label, was
                        described as a home security product.{" "}
                        <strong className="text-white">Deconstruct</strong>, the skincare brand, came
                        back as a plant-based meat company. Three of 26 brands, more than one in
                        ten, were the victim of mistaken identity.
                    </p>
                    <p>
                        This matters because it is a different problem with a different fix. A
                        stale price is a freshness issue: publish the current number and the
                        retrieval layer catches up. Entity confusion is an identity issue. The
                        model does not know you are a distinct company from the other one sharing
                        your name, and no amount of updating your pricing page fixes that. It is
                        solved with disambiguation work: structured data, a clear knowledge-graph
                        presence, and consistent naming across the high-authority web.
                    </p>

                    <div className="my-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[14.5px] text-zinc-200 leading-relaxed italic">
                        We report entity confusion separately from factual drift, because lumping
                        them together would inflate a scary headline number while hiding the fact
                        that they need completely different remedies.
                    </div>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Why the model sounds so sure</h2>
                    <p>
                        A language model predicts the next most probable piece of text. It has no
                        internal flag that fires when it is guessing. Reinforcement learning from
                        human feedback then trains it to sound helpful and decisive, because
                        helpful and decisive is what human raters preferred. The result is a system
                        that delivers a wrong price in exactly the same confident register as a
                        correct one.
                    </p>
                    <p>
                        This is not a defect that gets patched in the next release. It is a
                        property of the method. Retrieval helps, grounding an answer in a fetched
                        page reduces invention, but it does not eliminate it: a grounded answer can
                        still carry a stale fact forward from training memory, or ground itself on
                        a third-party page that is itself out of date.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">What this costs a brand</h2>
                    <p>
                        Consider the mechanics. A buyer asks an assistant which product to choose.
                        The assistant names you, which by the standards of every AI visibility tool
                        on the market is a win. It then quotes a price you abandoned eight months
                        ago, or attributes a feature you do not have, or describes a different
                        company&apos;s product line. The buyer either arrives with wrong expectations or
                        does not arrive at all.
                    </p>
                    <p>
                        Your analytics show nothing, because there was no click. Your AI visibility
                        dashboard, if you have one, shows a mention and a green number. The failure
                        is invisible at exactly the layer most teams are measuring.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">What to do about it</h2>
                    <p>
                        First, check. Ask the engines the questions your buyers ask and read what
                        comes back, in full, not just whether your name appears. Do it repeatedly,
                        because the output varies between runs.
                    </p>
                    <p>
                        Second, fix your own ground truth. Models retrieve from your live pages, so
                        outdated pricing, specs and product pages on your own site are the cheapest
                        errors to eliminate.
                    </p>
                    <p>
                        Third, fix the third-party record. Old listicles and stale directory
                        entries carrying your former pricing are actively teaching the model wrong
                        facts. These are worth chasing down.
                    </p>
                    <p>
                        Fourth, if you share a name with another company, treat disambiguation as
                        infrastructure. Structured data, a clean Wikidata and knowledge-graph
                        presence, and consistent naming everywhere are what teach the model you are
                        a separate entity.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Common questions</h2>
                    {FAQS.map(f => (
                        <div key={f.q}>
                            <p><strong className="text-white">{f.q}</strong></p>
                            <p>{f.a}</p>
                        </div>
                    ))}

                    <p className="pt-2">
                        The full methodology, sample sizes and per-brand receipts are published in
                        the{" "}
                        <Link href="/india-index" className="text-[var(--accent-base)] hover:underline">India AI Visibility Index</Link>.
                        You can also{" "}
                        <Link href="/" className="text-[var(--accent-base)] hover:underline">run a free scan</Link>{" "}
                        on your own brand and read exactly what the AI says about you.
                    </p>

                    <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                        <NewsletterSubscribe source="post-brand-facts-wrong" variant="footer" />
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link href="/blog" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">← All posts</Link>
                        <Link href="/methodology" className="text-[13px] text-[var(--accent-base)] hover:underline">Read the methodology →</Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
