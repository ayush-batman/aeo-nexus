import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd, FaqJsonLd } from "@/components/seo/structured-data";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

const post = getPostBySlug('ai-visibility-score-coin-flip')!;

const FAQS = [
    {
        q: "Why do I get different answers from ChatGPT for the same question?",
        a: "Consumer assistants generate text by sampling from a probability distribution at a non-zero temperature. That randomness is deliberate, it makes answers feel natural. The side effect is that the same prompt can return different brands on different runs.",
    },
    {
        q: "How many times should you sample an AI visibility check?",
        a: "One run tells you almost nothing. Around seven runs distinguishes large differences. Twenty runs per engine gives a reasonably tight estimate for category-level comparison. Whatever the number, a credible tool publishes it alongside the result.",
    },
    {
        q: "What is the right metric for AI visibility?",
        a: "A probability, not a rank. The honest unit is 'this brand appears in this answer X percent of the time, at average position Y', reported per engine and stamped with the model version and date.",
    },
    {
        q: "Does a higher AI visibility score mean more traffic?",
        a: "Not necessarily. Most AI answers end without a click, so presence in an answer influences demand without producing a measurable visit. Treat visibility as share of influence, not as a traffic forecast.",
    },
];

export const metadata: Metadata = {
    title: post.title,
    description: post.excerpt,
    keywords: ['AI visibility score', 'AI visibility measurement', 'LLM nondeterminism', 'AI SEO metrics', 'how to measure AI visibility'],
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.publishedAt, authors: [post.author] },
};

export default function CoinFlipPost() {
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
                        Most AI visibility tools will tell you that you rank third for a query. Ask
                        the model the same question again and you might rank first, or not appear
                        at all. The number was never a rank. It was one sample from a probability
                        distribution, reported as if it were a fact.
                    </p>
                    <p>
                        This is the uncomfortable thing about an entire young category: a lot of
                        the numbers being sold are single observations of a random process. If you
                        are going to spend budget on this channel, it is worth understanding why,
                        and what a defensible number looks like instead.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Why the same question gives different answers</h2>
                    <p>
                        A language model generates text one token at a time. At each step it
                        produces a probability distribution over possible next tokens and picks
                        one. How it picks is governed by a setting called temperature. At
                        temperature zero it always takes the most likely token and behaves close to
                        deterministically. Above zero it samples, which is what makes output feel
                        varied and natural rather than robotic.
                    </p>
                    <p>
                        Consumer assistants run above zero. That is a product decision, not a bug.
                        But it means the answer to &ldquo;best pressure washer in India&rdquo; is not a fixed
                        list. It is a distribution over lists.
                    </p>
                    <p>
                        Retrieval adds a second layer of variance. Modern answer engines expand one
                        question into many back-end searches, a technique Google has described as
                        query fan-out for its AI Mode. Different sub-queries surface different
                        pages, different pages survive reranking, and the model synthesizes from a
                        slightly different evidence pile each time.
                    </p>

                    <div className="my-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[14.5px] text-zinc-200 leading-relaxed italic">
                        Asking a model once and reporting the result is like polling one voter and
                        publishing the election outcome.
                    </div>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">What a defensible number looks like</h2>
                    <p>
                        If the underlying reality is a distribution, the honest unit of measurement
                        is a probability with a stated confidence, not a position on a leaderboard.
                        The claim should read: this brand appears in this answer 40 percent of the
                        time, at an average position of three, on this engine, on this model
                        version, measured on this date, from this many samples.
                    </p>
                    <p>
                        The statistics are not exotic. For a proportion, the uncertainty shrinks
                        roughly with the square root of the sample count. At one sample you have
                        nothing. Around seven samples you can separate a brand that dominates from
                        one that rarely appears. At twenty you have an estimate tight enough to
                        compare brands within a category and to detect real movement over time.
                    </p>
                    <p>
                        None of this is difficult. It is just more expensive than asking once,
                        which is precisely why so few tools do it.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">The version problem underneath</h2>
                    <p>
                        There is a second source of drift that is easy to miss. The model you
                        measured last month is not the model you are measuring today. Providers
                        update weights and system behaviour continuously, and an update can
                        reshuffle which brands a model favours.
                    </p>
                    <p>
                        This creates a genuine attribution trap. Your visibility improves, and you
                        credit the content you shipped. It may equally have been a model update
                        that had nothing to do with you. Without version stamps on every
                        measurement, there is no way to tell the two apart, and you end up
                        optimizing against noise.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Three questions to ask any vendor</h2>
                    <p>
                        <strong className="text-white">How many times do you sample each prompt,
                        and do you publish it?</strong> If the answer is one, or if they will not
                        say, the number is not a measurement.
                    </p>
                    <p>
                        <strong className="text-white">Can I see the raw answer behind this
                        score?</strong> Every derived number should open to the exact prompt, the
                        verbatim response, and the timestamp. If you cannot audit it, you are being
                        asked to trust a black box in a category whose entire value is
                        transparency.
                    </p>
                    <p>
                        <strong className="text-white">Do you stamp the model version?</strong>{" "}
                        Without it, month-over-month comparisons are not comparable.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Why this is not just methodology pedantry</h2>
                    <p>
                        Because decisions get made on these numbers. A team sees a score drop and
                        rewrites a page that was fine. A team sees a score rise and doubles down on
                        content that did nothing. In a channel where you cannot see clicks and
                        cannot see referrers, the measurement <em>is</em> the feedback loop. If the
                        loop is noise, the strategy is noise.
                    </p>
                    <p>
                        We publish our sample sizes because we would rather show a wide confidence
                        interval than a clean number we cannot defend. When our{" "}
                        <Link href="/india-index" className="text-[var(--accent-base)] hover:underline">India AI Visibility Index</Link>{" "}
                        first went out with too small a sample, we rebuilt it at twenty runs per
                        engine per category rather than publish something that contradicted our own
                        methodology.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Common questions</h2>
                    {FAQS.map(f => (
                        <div key={f.q}>
                            <p><strong className="text-white">{f.q}</strong></p>
                            <p>{f.a}</p>
                        </div>
                    ))}

                    <p className="pt-2">
                        Our full sampling approach and scoring curve are published on the{" "}
                        <Link href="/methodology" className="text-[var(--accent-base)] hover:underline">methodology page</Link>.
                        If you want to see the variance yourself, {" "}
                        <Link href="/" className="text-[var(--accent-base)] hover:underline">run a free scan</Link>{" "}
                        and then run it again.
                    </p>

                    <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                        <NewsletterSubscribe source="post-coin-flip" variant="footer" />
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link href="/blog" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">← All posts</Link>
                        <Link href="/blog/ai-gets-brand-facts-wrong" className="text-[13px] text-[var(--accent-base)] hover:underline">AI gets 1 in 8 brand facts wrong →</Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
