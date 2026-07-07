import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog";
import { ArticleJsonLd } from "@/components/seo/structured-data";

const post = getPostBySlug('the-receipt-is-the-product')!;

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

export default function ReceiptIsTheProductPost() {
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
                        When we started building Aelo, we spent a month convinced the product
                        was &ldquo;the dashboard.&rdquo; Then we watched three prospective customers use
                        the beta, and every single one of them asked the same question within
                        the first minute:
                    </p>
                    <p className="font-medium text-white italic">
                        &ldquo;How do you actually compute this number?&rdquo;
                    </p>
                    <p>
                        We had a good answer. We had methodology docs. We had a nice
                        explainer video. It didn&apos;t matter. Every one of them wanted to see
                        the <em>underneath</em>: the exact prompts we sent, the exact responses
                        we got, the timestamp, the platform. They didn&apos;t want to trust our
                        math. They wanted to check it themselves.
                    </p>
                    <p>
                        So we shipped the drawer.
                    </p>
                    <p>
                        Every number in Aelo — every health score, every mention rate, every
                        share-of-voice percentage — is one click away from a list of the raw
                        scans that produced it. Click a metric, see the prompt, see the LLM&apos;s
                        response text verbatim, see when it was captured. There&apos;s a &ldquo;Copy
                        prompt&rdquo; button and a &ldquo;Reproduce on Gemini&rdquo; link that opens the
                        native chat UI. Anyone can verify anything in thirty seconds.
                    </p>
                    <p>
                        The <Link href="/india-index" className="text-[var(--accent-base)] hover:underline">India AI Visibility Index</Link>{" "}
                        takes this one step further: the receipts are public. No login. No
                        signup gate. Click any ranked brand and you see the exact scans behind
                        its position. If we&apos;re wrong, you&apos;ll know immediately.
                    </p>
                    <p>
                        This is the whole thesis. We&apos;re not selling you a dashboard. We&apos;re
                        selling you an <strong className="text-white">audit trail</strong>. The dashboard is just where you
                        happen to see it.
                    </p>

                    <div className="my-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[14.5px] text-zinc-200 leading-relaxed italic">
                        Your CMO doesn&apos;t want a green number. Your CMO wants to defend the
                        green number when the CEO asks about it. That&apos;s what the receipt is
                        for.
                    </div>

                    <p>
                        Everything in Aelo cascades from this: our{" "}
                        <Link href="/methodology" className="text-[var(--accent-base)] hover:underline">methodology page</Link>{" "}
                        publishes every formula. Our verdict badges only fire above real
                        thresholds — no smoothing. Our{" "}
                        <Link href="/dashboard/interventions" className="text-[var(--accent-base)] hover:underline">
                            interventions receipts
                        </Link>{" "}
                        say <span className="font-mono text-zinc-400">±0 pts</span> when the
                        work didn&apos;t move the number, because the honest number is more
                        valuable than a hopeful one.
                    </p>
                    <p>
                        Some of our competitors will eventually copy the drawer. They&apos;ll
                        add a &ldquo;see the scan&rdquo; button on their black-box AI Score. It won&apos;t
                        work, because their score is still a blend of a blend. The receipt
                        can&apos;t just be a feature bolted on top; it has to be the thing the
                        entire product organizes around.
                    </p>
                    <p>
                        The receipt is the product.
                    </p>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link href="/blog" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">
                            ← All posts
                        </Link>
                        <Link href="/methodology" className="text-[13px] text-[var(--accent-base)] hover:underline">
                            Read the methodology →
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
}
