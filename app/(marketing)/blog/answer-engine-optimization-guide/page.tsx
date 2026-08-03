import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd } from "@/components/seo/structured-data";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

const post = getPostBySlug('answer-engine-optimization-guide')!;

export const metadata: Metadata = {
    title: post.title,
    description: post.excerpt,
    keywords: [
        'answer engine optimization',
        'AEO',
        'generative engine optimization',
        'GEO',
        'AI SEO',
        'how to rank in ChatGPT',
        'how to show up in AI search',
        'AI visibility',
    ],
    openGraph: {
        title: post.title,
        description: post.excerpt,
        type: 'article',
        publishedTime: post.publishedAt,
        authors: [post.author],
    },
};

export default function AeoGuidePost() {
    return (
        <article className="pt-20 pb-20 md:pt-28 md:pb-28 px-6">
            <ArticleJsonLd post={post} />
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
                    <p className="text-[15px] md:text-[17px] text-zinc-400 leading-relaxed">
                        {post.excerpt}
                    </p>
                </div>

                <div className="space-y-5 text-[15.5px] text-zinc-300 leading-relaxed">
                    <p>
                        Answer Engine Optimization (AEO) is the practice of getting your brand
                        named, quoted, and recommended inside the answers that AI assistants give.
                        When a buyer asks ChatGPT, Gemini, Claude or Perplexity which product to
                        choose, the model responds directly, and increasingly the buyer never
                        clicks a link. AEO is how you influence what the model says. You will also
                        hear it called Generative Engine Optimization (GEO), AI SEO, or LLM
                        optimization. The industry has not settled on one term, but the goal is the
                        same: be the answer, not just a result.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">
                        The two doors: how a brand ends up in an AI answer
                    </h2>
                    <p>
                        A model answering about your brand is drawing on two different memories,
                        and you have to win at both.
                    </p>
                    <p>
                        <strong className="text-white">The first door is training memory.</strong>{" "}
                        Everything the model absorbed when it was built, filtered from the open
                        web, Wikipedia, respected publications, and community platforms like
                        Reddit. This memory is broad but frozen at a cutoff date and impossible to
                        edit directly. If the web was thin or wrong about you when the model
                        trained, the model is thin or wrong about you. You earn a place here
                        slowly, through broad, consistent, correct representation across the
                        high-authority web.
                    </p>
                    <p>
                        <strong className="text-white">The second door is live retrieval.</strong>{" "}
                        Modern answer engines fetch fresh pages at the moment of the question and
                        ground their answer in them. This is the door you can influence this week,
                        by publishing content that gets retrieved, survives the engine&apos;s
                        reranking, and is clean enough to quote. Most of the practical playbook
                        below is about this second door.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">
                        What actually moves citations (with the research)
                    </h2>
                    <p>
                        The foundational study here is the Princeton-led paper on Generative
                        Engine Optimization, which tested what content changes make a source get
                        cited more often inside AI answers. The results are specific and worth
                        memorizing:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
                        <li>Adding <strong className="text-white">authoritative quotations</strong> lifted visibility in AI answers by around <strong className="text-white">41 percent</strong>.</li>
                        <li>Adding <strong className="text-white">statistics</strong> lifted it by around <strong className="text-white">32 percent</strong>.</li>
                        <li>Adding <strong className="text-white">citations to credible sources</strong> lifted it by around <strong className="text-white">30 percent</strong>.</li>
                        <li>Improving <strong className="text-white">fluency</strong> lifted it by roughly <strong className="text-white">24 to 28 percent</strong>.</li>
                        <li><strong className="text-white">Keyword stuffing</strong>, the old SEO reflex, did essentially nothing, and sometimes hurt.</li>
                    </ul>
                    <p>
                        The pattern is clear. Generative engines reward content that reads like a
                        credible source: specific numbers, real quotes, clear attribution, clean
                        prose the model can lift a sentence from. They do not reward the tricks
                        that worked on a ranking algorithm.
                    </p>

                    <div className="my-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[14.5px] text-zinc-200 leading-relaxed italic">
                        Write the sentence you want the AI to quote, and back it with a real
                        number and a real source. That single habit is most of AEO.
                    </div>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">
                        The practical AEO playbook
                    </h2>
                    <ol className="list-decimal pl-5 space-y-2.5 text-zinc-300">
                        <li><strong className="text-white">Answer the real questions directly.</strong> Structure pages around the exact questions buyers ask an assistant, with the answer stated cleanly in the first sentence, then the detail.</li>
                        <li><strong className="text-white">Lead with quotes and statistics.</strong> Every important claim gets a number or an attributed quote. This is the single highest-leverage change the research supports.</li>
                        <li><strong className="text-white">Add structured data.</strong> Clear FAQ and product markup helps machines parse and reuse your facts. It will not carry a weak page, but it helps a strong one.</li>
                        <li><strong className="text-white">Get onto the surfaces engines cite.</strong> YouTube, Reddit, review sites and respected industry press are cited far more than most brands realize. Presence there feeds both doors.</li>
                        <li><strong className="text-white">Keep your own facts current and consistent.</strong> Models carry stale facts forward confidently. A wrong price copied across old listicles becomes the model&apos;s belief. Fix your live pages and the high-traffic third-party sources.</li>
                        <li><strong className="text-white">Earn a defensible Wikipedia and knowledge-graph presence.</strong> These feed training memory disproportionately, which shapes the answers retrieval can never fully override.</li>
                        <li><strong className="text-white">Skip the snake oil.</strong> The proposed <span className="font-mono text-zinc-400">llms.txt</span> file is, as of now, largely ineffective, and Google has said it does not use it. Do not let anyone sell you on it.</li>
                    </ol>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">
                        AEO is not SEO with a new name
                    </h2>
                    <p>
                        It is tempting to treat this as another ranking channel. The data says
                        otherwise. Studies put the overlap between AI-answer citations and the
                        classic top-ten Google links at only around 13 percent, so being on page
                        one is no guarantee of being in the answer. The output is a probability,
                        not a fixed rank: ask the same question twice and you can get different
                        brands. And the levers are different, quotes and statistics move the
                        needle while keyword density does not. This is why an SEO suite&apos;s
                        bolt-on AI tab only takes you part of the way.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">
                        How to measure whether it is working
                    </h2>
                    <p>
                        Because the models are probabilistic and most answers end without a click,
                        you cannot see this channel in normal analytics. The only honest way to
                        know your standing is to ask the models the real buyer questions yourself,
                        many times, across every engine, and record what they say. That is exactly
                        what <Link href="/" className="text-[var(--accent-base)] hover:underline">Aelo</Link>{" "}
                        does, with the raw receipt behind every number, and it is why we check not
                        just whether you are named but whether what the model says about you is
                        true. You can{" "}
                        <Link href="/" className="text-[var(--accent-base)] hover:underline">run a free scan</Link>{" "}
                        on any brand to see where it stands today.
                    </p>

                    <h2 className="text-xl md:text-2xl font-medium text-white pt-6">
                        Common questions
                    </h2>
                    <p>
                        <strong className="text-white">What is the difference between AEO and GEO?</strong>{" "}
                        Very little in practice. GEO (Generative Engine Optimization) is the broader
                        term for optimizing across generative AI; AEO (Answer Engine Optimization)
                        emphasizes the answer-and-citation layer specifically. Most people use them
                        interchangeably.
                    </p>
                    <p>
                        <strong className="text-white">How long does AEO take to work?</strong>{" "}
                        The live-retrieval door can move in days to weeks once you publish
                        quotable, current content. The training-memory door moves over model
                        generations, months, because it depends on the next time the model is
                        trained on a web that represents you correctly.
                    </p>
                    <p>
                        <strong className="text-white">Do I still need SEO?</strong> Yes. Classic
                        SEO still drives clicks and still feeds the index that retrieval pulls
                        from. AEO sits on top of it for the growing share of buyers who get their
                        answer without clicking. Treat them as two layers, not a replacement.
                    </p>

                    <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                        <NewsletterSubscribe source="post-aeo-guide" variant="footer" />
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link href="/blog" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">
                            ← All posts
                        </Link>
                        <Link href="/blog/best-ai-visibility-tools-2026" className="text-[13px] text-[var(--accent-base)] hover:underline">
                            Compare the AI visibility tools →
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
