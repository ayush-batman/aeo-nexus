import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd, FaqJsonLd } from "@/components/seo/structured-data";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

const post = getPostBySlug('how-to-get-cited-by-chatgpt')!;

const FAQS = [
    {
        q: "How do you get cited by ChatGPT?",
        a: "Publish content ChatGPT's retrieval layer can find and quote: a direct answer in the opening lines, question-shaped headings, specific statistics, attributed quotes, and clean extractable sentences. Presence on sources it leans on, such as Reddit, YouTube and respected industry press, matters as much as your own site.",
    },
    {
        q: "Does ChatGPT use Google to find sources?",
        a: "No. ChatGPT's search uses a Bing-based index, while Google's AI Overviews and Gemini use Google's index. That is one reason a brand can be visible on one engine and absent on another, and why measuring a single engine is misleading.",
    },
    {
        q: "How many sources does ChatGPT cite per answer?",
        a: "Far fewer than Perplexity. Studies place ChatGPT in the single digits per answer while Perplexity often cites twenty or more. Fewer citation slots means the competition for each one is harder.",
    },
    {
        q: "Does keyword optimization help you get cited by ChatGPT?",
        a: "Not meaningfully. Research on generative engines found keyword stuffing produced roughly no gain, while adding quotations lifted citation rates about 41 percent and statistics about 32 percent.",
    },
];

export const metadata: Metadata = {
    title: post.title,
    description: post.excerpt,
    keywords: ['how to get cited by ChatGPT', 'rank in ChatGPT', 'ChatGPT SEO', 'ChatGPT citations', 'AI visibility', 'answer engine optimization'],
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.publishedAt, authors: [post.author] },
};

export default function CitedByChatGPTPost() {
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
                        Getting cited by ChatGPT comes down to two separate battles that most
                        advice collapses into one. There is what the model already believes about
                        your category from training, and there is what it retrieves and quotes at
                        the moment someone asks. They have different mechanics, different
                        timelines, and different tactics. Confuse them and you will spend months
                        optimizing the wrong thing.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">First, understand which ChatGPT you are optimizing for</h2>
                    <p>
                        ChatGPT answers in two modes. In its default mode it draws on parametric
                        memory, everything absorbed during training. That memory is broad, frozen
                        at a cutoff date, and impossible to edit. If it thinks your competitor is
                        the category leader, no amount of publishing this week changes that answer
                        directly.
                    </p>
                    <p>
                        In search mode it retrieves live pages and grounds the answer in them,
                        citing sources. This is the mode you can influence quickly, and it is where
                        practical citation work happens.
                    </p>
                    <p>
                        A detail worth knowing: ChatGPT&apos;s search runs on a Bing-based index, not
                        Google&apos;s. Google&apos;s AI Overviews and Gemini use Google&apos;s. This is a
                        concrete reason a brand shows up strongly in one engine and vanishes in
                        another, and why judging your AI visibility from one engine gives you a
                        quarter of the picture.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">The citation funnel is brutal</h2>
                    <p>
                        Before your page can be quoted, it has to survive a sequence of filters.
                        The engine expands the user&apos;s question into multiple back-end searches.
                        Each search returns candidates. A reranking model scores those candidates
                        and discards the large majority. Only a handful survive into the context
                        the model actually reads, and ChatGPT cites notably few of them, single
                        digits per answer in most studies, against twenty or more for Perplexity.
                    </p>
                    <p>
                        Fewer citation slots means the bar per slot is higher. Being retrievable is
                        not enough. You have to be the most quotable thing in the pile.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">What the research says actually works</h2>
                    <p>
                        This is where most advice becomes guesswork, so it is worth anchoring to
                        the one serious study on the question. Princeton-led research on generative
                        engine optimization tested which content changes increase citation rates
                        inside AI answers. The results were specific:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
                        <li>Adding <strong className="text-white">authoritative quotations</strong>: roughly <strong className="text-white">+41 percent</strong> visibility.</li>
                        <li>Adding <strong className="text-white">statistics</strong>: roughly <strong className="text-white">+32 percent</strong>.</li>
                        <li>Adding <strong className="text-white">citations to credible sources</strong>: roughly <strong className="text-white">+30 percent</strong>.</li>
                        <li>Improving <strong className="text-white">fluency</strong>: roughly <strong className="text-white">+24 to 28 percent</strong>.</li>
                        <li><strong className="text-white">Keyword stuffing</strong>: essentially nothing.</li>
                    </ul>
                    <p>
                        Notably, the gains were largest for sources that started lower in the
                        ranking. Generative engines are, in this narrow sense, more meritocratic
                        than classic search: a well-constructed page from a smaller site can win a
                        citation slot that its domain authority would never win in blue links.
                    </p>

                    <div className="my-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[14.5px] text-zinc-200 leading-relaxed italic">
                        Write the sentence you want the model to quote. Put a real number in it.
                        Attribute it. That single habit outperforms every keyword tactic.
                    </div>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">The practical checklist</h2>
                    <ol className="list-decimal pl-5 space-y-2.5 text-zinc-300">
                        <li><strong className="text-white">Answer in the first two sentences.</strong> Models lift opening lines. Bury the answer under three paragraphs of preamble and you forfeit the slot.</li>
                        <li><strong className="text-white">Use question-shaped headings.</strong> Match how a person actually phrases the question, then answer immediately underneath.</li>
                        <li><strong className="text-white">Make every claim self-contained.</strong> A sentence that needs the previous paragraph to make sense cannot be quoted in isolation.</li>
                        <li><strong className="text-white">Lead with specifics.</strong> Numbers, dates, prices, named sources. Vague superlatives are unquotable.</li>
                        <li><strong className="text-white">Add FAQ and product structured data.</strong> It will not rescue a weak page, but it helps a strong one get parsed and reused.</li>
                        <li><strong className="text-white">Show up where the engines already look.</strong> Reddit, YouTube and established industry press are cited far more than most brands expect. A strong Reddit thread can outrank your own site as a source.</li>
                        <li><strong className="text-white">Keep facts current.</strong> Stale prices on your own pages and in old third-party listicles get quoted back at buyers as truth.</li>
                        <li><strong className="text-white">Ignore llms.txt.</strong> The proposed file has little evidence behind it and Google has said it does not use it. It is the current snake oil of the category.</li>
                    </ol>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">How to tell if it is working</h2>
                    <p>
                        You cannot see this in analytics. Most AI answers end without a click, so
                        there is no referrer and no impression to count. The only way to know is to
                        ask the engines the questions your buyers ask and record what comes back,
                        repeatedly, because a single check is a coin flip rather than a
                        measurement. We wrote about why{" "}
                        <Link href="/blog/ai-visibility-score-coin-flip" className="text-[var(--accent-base)] hover:underline">single-shot AI visibility scores are noise</Link>{" "}
                        if you want the statistics.
                    </p>
                    <p>
                        And when you check, read the whole answer, not just whether your name
                        appears. Being cited with a wrong price is not a win. In our own testing,{" "}
                        <Link href="/blog/ai-gets-brand-facts-wrong" className="text-[var(--accent-base)] hover:underline">roughly one in eight brand facts came back wrong or outdated</Link>.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">Common questions</h2>
                    {FAQS.map(f => (
                        <div key={f.q}>
                            <p><strong className="text-white">{f.q}</strong></p>
                            <p>{f.a}</p>
                        </div>
                    ))}

                    <p className="pt-2">
                        For the full picture across every engine, read the{" "}
                        <Link href="/blog/answer-engine-optimization-guide" className="text-[var(--accent-base)] hover:underline">guide to Answer Engine Optimization</Link>, or{" "}
                        <Link href="/" className="text-[var(--accent-base)] hover:underline">run a free scan</Link>{" "}
                        to see where you stand today.
                    </p>

                    <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                        <NewsletterSubscribe source="post-cited-by-chatgpt" variant="footer" />
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link href="/blog" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">← All posts</Link>
                        <Link href="/blog/answer-engine-optimization-guide" className="text-[13px] text-[var(--accent-base)] hover:underline">The full AEO guide →</Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
