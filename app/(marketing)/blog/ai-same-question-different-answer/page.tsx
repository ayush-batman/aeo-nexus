import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd, FaqJsonLd } from "@/components/seo/structured-data";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

const post = getPostBySlug('ai-same-question-different-answer')!;

const FAQS = [
    {
        q: "Does AI give the same answer every time you ask?",
        a: "No. In our experiment, asking an AI the identical 'best brand in India' question twice returned a different number one recommendation about 45 percent of the time. Consumer assistants sample from a probability distribution, so the same prompt can name a different brand on each run.",
    },
    {
        q: "Why does ChatGPT recommend different brands for the same question?",
        a: "Two reasons. The model generates text by sampling at a non-zero temperature, which is random by design, and answer engines expand one question into many back-end searches that surface a slightly different evidence pile each time. Both push the top recommendation around.",
    },
    {
        q: "How many times should you run an AI visibility check?",
        a: "One run is close to meaningless for a contested category. Around seven runs separates a dominant brand from a rare one. Twenty runs per engine gives an estimate tight enough to compare brands and detect real movement. The right answer is to sample repeatedly and report the distribution.",
    },
    {
        q: "Is a one-time AI visibility score reliable?",
        a: "Not for competitive categories. If a single check shows your brand ranked first, a rerun minutes later can crown someone else. A credible measurement reports how often you appear and at what average position, across many runs, stamped with the model version and date.",
    },
];

export const metadata: Metadata = {
    title: post.title,
    description: post.excerpt,
    keywords: ['AI recommendation consistency', 'does ChatGPT give different answers', 'AI brand recommendation', 'LLM nondeterminism', 'AI visibility reliability', 'same question different answer AI'],
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.publishedAt, authors: [post.author] },
};

const TABLE: { cat: string; engine: string; unique: number; diff: string; dist: string }[] = [
    { cat: 'Coffee', engine: 'ChatGPT', unique: 2, diff: '20%', dist: 'Blue Tokai 9/10, Bru 1/10' },
    { cat: 'Coffee', engine: 'Gemini', unique: 3, diff: '64%', dist: 'Sleepy Owl 5, Blue Tokai 4, Rage 1' },
    { cat: "Men's fashion", engine: 'ChatGPT', unique: 2, diff: '20%', dist: 'Raymond 9/10, Zara 1/10' },
    { cat: "Men's fashion", engine: 'Gemini', unique: 5, diff: '67%', dist: 'Louis Philippe 6, + 4 others once each' },
    { cat: 'Protein bars', engine: 'ChatGPT', unique: 4, diff: '71%', dist: 'MuscleBlaze 5, RiteBite 3, +2' },
    { cat: 'Protein bars', engine: 'Gemini', unique: 4, diff: '73%', dist: 'RiteBite 5, Myprotein 2, MuscleBlaze 2, Yoga Bar 1' },
    { cat: 'Skincare', engine: 'ChatGPT', unique: 4, diff: '64%', dist: 'La Roche-Posay 6, Minimalist 2, +2' },
    { cat: 'Skincare', engine: 'Gemini', unique: 2, diff: '47%', dist: 'Plum 7/10, Forest Essentials 3/10' },
    { cat: 'Wireless earbuds', engine: 'ChatGPT', unique: 2, diff: '20%', dist: 'Sony 9/10, Apple 1/10' },
    { cat: 'Wireless earbuds', engine: 'Gemini', unique: 1, diff: '0%', dist: 'Sony 10/10' },
];

export default function VolatilityPost() {
    return (
        <article className="pt-20 pb-20 md:pt-28 md:pb-28 px-6">
            <ArticleJsonLd post={post} />
            <FaqJsonLd items={FAQS} />
            <div className="mx-auto max-w-2xl">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                        <span className="text-[var(--accent-base)]">{post.category}</span>
                        <span>·</span>
                        <time dateTime={post.publishedAt}>August 18, 2026</time>
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
                        We ran a simple experiment. We took five product categories where real
                        brands compete, wrote one natural buying question for each, and asked it one
                        hundred times across two AI engines in a single session. The prompt never
                        changed. The answers did.
                    </p>
                    <p>
                        Across all five categories and both engines, asking the identical question
                        twice returned a different top brand about <strong className="text-white">45 percent
                        of the time</strong>. For the average buying question, the AI&apos;s number one
                        recommendation is close to a coin flip. That single fact is the reason a
                        one-time AI visibility check cannot be trusted.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">How we tested it</h2>
                    <p>
                        Five categories, chosen because more than one brand genuinely competes:
                        skincare, coffee, protein bars, wireless earbuds, and men&apos;s fashion, all
                        in an India context. For each, one fixed prompt: &ldquo;What are the best
                        [category] brands in India right now? Give me a numbered ranked list of your
                        top five, brand names only, best first.&rdquo;
                    </p>
                    <p>
                        We ran that prompt ten times per category on each of two engines, ChatGPT
                        (via the API, model gpt-5-mini) and Gemini (gemini-2.5-flash). One hundred
                        fresh calls, a short delay between each, no memory carried between runs, and
                        default sampling, the same randomness a normal user gets. Every response was
                        stored verbatim with its model version and timestamp, so every number below
                        traces back to a real call. Nothing is estimated.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">The result, category by category</h2>
                    <p>
                        For each engine and category we counted how many distinct brands took the
                        number one spot across the ten runs, and the probability that two runs
                        disagree on the winner. A volatility of one means a perfectly stable winner.
                        Higher means the top recommendation kept changing.
                    </p>

                    <div className="my-6 overflow-x-auto rounded-lg border border-white/10">
                        <table className="w-full text-[13.5px] text-zinc-300 border-collapse">
                            <thead>
                                <tr className="text-left text-zinc-500 border-b border-white/10">
                                    <th className="px-3 py-2.5 font-medium">Category</th>
                                    <th className="px-3 py-2.5 font-medium">Engine</th>
                                    <th className="px-3 py-2.5 font-medium text-center">Unique #1</th>
                                    <th className="px-3 py-2.5 font-medium text-center">Differ</th>
                                    <th className="px-3 py-2.5 font-medium">Top brand split</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TABLE.map((r, i) => (
                                    <tr key={i} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-2.5">{r.cat}</td>
                                        <td className="px-3 py-2.5 text-zinc-400">{r.engine}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums">{r.unique}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums text-[var(--accent-base)]">{r.diff}</td>
                                        <td className="px-3 py-2.5 text-zinc-400">{r.dist}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[13.5px] text-zinc-500">
                        &ldquo;Differ&rdquo; is the chance two runs of the same question name a different number
                        one. Brand-name variants that are clearly the same brand, such as Blue Tokai
                        and Blue Tokai Coffee Roasters, were merged before counting.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">The most volatile and the most stable</h2>
                    <p>
                        <strong className="text-white">Protein bars were the most volatile</strong>, at
                        72 percent. Neither engine could hold a number one. Across twenty runs the
                        top slot went to MuscleBlaze, RiteBite, Grenade, The Whole Truth, Myprotein,
                        and Yoga Bar. A brand that saw itself ranked first once had worse than even
                        odds of staying there on a rerun.
                    </p>
                    <p>
                        <strong className="text-white">Wireless earbuds were the most stable</strong>, at
                        10 percent. Sony was named first in nineteen of twenty runs, and Gemini said
                        Sony ten out of ten. When a category has one obvious answer, the models agree
                        with themselves. When it does not, the winner is close to random.
                    </p>

                    <div className="my-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[14.5px] text-zinc-200 leading-relaxed italic">
                        The less settled a category, the more your brand&apos;s AI visibility is
                        decided by a dice roll, and the more a single check will lie to you.
                    </div>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Why the same question moves</h2>
                    <p>
                        A language model produces text by sampling one token at a time from a
                        probability distribution. Consumer assistants run at a non-zero temperature
                        on purpose, because it makes answers feel natural rather than robotic. The
                        side effect is that &ldquo;best protein bar in India&rdquo; is not a fixed list. It is
                        a distribution over lists.
                    </p>
                    <p>
                        Retrieval adds a second layer. Modern answer engines expand one question
                        into many back-end searches, then synthesize from whichever pages survive
                        reranking that time. We wrote about the mechanics of this in{" "}
                        <Link href="/blog/ai-visibility-score-coin-flip" className="text-[var(--accent-base)] hover:underline">why your AI visibility score is probably a coin flip</Link>.
                        This experiment is that argument made concrete, with a hundred receipts.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">What it means for measuring AI visibility</h2>
                    <p>
                        If the underlying reality is a distribution, a single observation is not a
                        measurement, it is one draw. Anyone selling you an &ldquo;AI visibility score&rdquo;
                        off one query is reporting noise dressed as a number. The honest unit is a
                        probability: this brand appears in this answer X percent of the time, at
                        average position Y, on this engine, on this model version, on this date, from
                        this many runs.
                    </p>
                    <p>
                        That is exactly how we build our{" "}
                        <Link href="/india-index" className="text-[var(--accent-base)] hover:underline">India AI Visibility Index</Link>, and
                        it is why we publish sample sizes instead of clean single digits. The
                        practical takeaway is not complicated. Do not check once. Sample repeatedly,
                        watch the distribution, and treat any category with a high volatility score
                        as a moving target rather than a settled ranking.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Common questions</h2>
                    {FAQS.map(f => (
                        <div key={f.q}>
                            <p><strong className="text-white">{f.q}</strong></p>
                            <p>{f.a}</p>
                        </div>
                    ))}

                    <p className="pt-2">
                        If you want to see the variance on your own brand,{" "}
                        <Link href="/" className="text-[var(--accent-base)] hover:underline">run a free scan</Link>{" "}
                        and then run it again. Our full sampling approach is on the{" "}
                        <Link href="/methodology" className="text-[var(--accent-base)] hover:underline">methodology page</Link>.
                    </p>

                    <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                        <NewsletterSubscribe source="post-volatility" variant="footer" />
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link href="/blog" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">← All posts</Link>
                        <Link href="/blog/ai-visibility-score-coin-flip" className="text-[13px] text-[var(--accent-base)] hover:underline">Why your score is a coin flip →</Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
