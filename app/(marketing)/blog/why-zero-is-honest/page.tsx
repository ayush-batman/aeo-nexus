import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd } from "@/components/seo/structured-data";

const post = getPostBySlug('why-zero-is-honest')!;

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

export default function WhyZeroIsHonestPost() {
    return (
        <article className="pt-20 pb-20 md:pt-28 md:pb-28 px-6">
            <ArticleJsonLd post={post} />
            <div className="mx-auto max-w-2xl">
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
                </div>

                <div className="space-y-5 text-[15.5px] text-zinc-300 leading-relaxed">
                    <p>
                        Look at any competing AI-visibility dashboard. Notice something odd?
                    </p>
                    <p>
                        Almost nothing ever scores under 40. The lowest-performing brand in
                        the lowest-performing category is still &ldquo;Fair — needs improvement.&rdquo;
                        The color is orange, not red. The trend arrow flickers upward. The
                        product manager who bought the tool gets a story to tell.
                    </p>
                    <p>
                        This is a design choice. It&apos;s not a technical constraint.
                    </p>
                    <p>
                        Under the hood, most competitors compute a &ldquo;visibility score&rdquo; that
                        blends four or five separate signals — mention rate, sentiment,
                        citation count, competitive share, brand-mention proximity — into a
                        single 0–100 number. Then they map <em>that</em> onto a curve so the
                        distribution feels helpful. A brand with 3% mention rate ends up at
                        42/100. A brand with 30% mention rate ends up at 68/100. Nobody sees a
                        zero.
                    </p>
                    <p>
                        It looks like a favor. It isn&apos;t.
                    </p>
                    <p>
                        <strong className="text-white">If your brand is genuinely invisible to Gemini for the queries your
                        buyers ask, you need to know that.</strong> You need to see the zero and feel
                        the sting of it. Because the alternative — being told you&apos;re at 42
                        when you&apos;re actually at zero — is the reason so many brands
                        &ldquo;invest in AEO&rdquo; for six months without moving the number, then blame the
                        strategy.
                    </p>
                    <p>
                        The problem was never the strategy. The problem was that they never
                        knew where they started.
                    </p>
                    <p>
                        Aelo doesn&apos;t curve. Aelo doesn&apos;t blend. If Gemini didn&apos;t mention
                        your brand in the last 30 scans, your mention rate is 0%. Your verdict
                        says <span className="font-mono text-[var(--data-red)]">Invisible</span>.
                        The color is red. The truth is bracing.
                    </p>
                    <p>
                        And then — this is the part that matters — you can{" "}
                        <Link href="/dashboard/interventions" className="text-[var(--accent-base)] hover:underline">
                            log an intervention
                        </Link>
                        , do the work, and re-measure a week later. The receipt tells you
                        whether the zero moved or whether it didn&apos;t. That&apos;s what
                        actionable measurement looks like.
                    </p>
                    <p>
                        Zero isn&apos;t a threat. It&apos;s a starting line.
                    </p>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link href="/blog" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">
                            ← All posts
                        </Link>
                        <Link href="/india-index" className="text-[13px] text-[var(--accent-base)] hover:underline">
                            See the honest numbers →
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
