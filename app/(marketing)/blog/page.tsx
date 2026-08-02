import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Rss } from "lucide-react";
import { POSTS } from "@/lib/blog";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

export const metadata: Metadata = {
    title: "Blog · Aelo",
    description: "Analysis, methodology, and field notes from Aelo, building the honest measurement layer for AI answer visibility.",
    alternates: {
        types: {
            "application/rss+xml": "/rss.xml",
        },
    },
};

// Sage index. Featured post gets full-bleed hero treatment; the rest render
// as a quiet list. No card-grid noise, no images-for-images' sake.
export default function BlogIndexPage() {
    const featured = POSTS.find(p => p.featured);
    const others   = POSTS.filter(p => !p.featured);

    return (
        <>
            {/* Hero */}
            <section className="pt-20 pb-8 md:pt-28 md:pb-10 px-6">
                <div className="mx-auto max-w-3xl">
                    <div className="flex items-baseline justify-between mb-3">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">
                            Blog
                        </p>
                        <a
                            href="/rss.xml"
                            className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 hover:text-[var(--accent-base)] transition-colors inline-flex items-center gap-1.5"
                        >
                            <Rss className="w-3 h-3" />
                            RSS
                        </a>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4 text-balance">
                        Analysis, methodology, and field notes from the AI-answer front.
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 max-w-2xl leading-relaxed mb-6">
                        No thought-leadership. No listicles. Real numbers with the receipts
                        attached, and the reasoning behind how we measure them.
                    </p>
                    <div className="max-w-lg">
                        <NewsletterSubscribe source="blog-index" variant="hero" />
                    </div>
                </div>
            </section>

            {/* Featured */}
            {featured && (
                <section className="pb-14 px-6">
                    <div className="mx-auto max-w-3xl">
                        <Link
                            href={`/blog/${featured.slug}`}
                            className="block rounded-lg border border-white/[0.08] bg-black hover:border-[var(--accent-base)]/40 transition-colors overflow-hidden group"
                        >
                            <div className="p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                                    <span className="text-[var(--accent-base)]">Featured</span>
                                    <span>·</span>
                                    <span>{featured.category}</span>
                                    <span>·</span>
                                    <time dateTime={featured.publishedAt}>
                                        {formatDate(featured.publishedAt)}
                                    </time>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3 max-w-2xl text-balance leading-snug">
                                    {featured.title}
                                </h2>
                                <p className="text-[14.5px] text-zinc-400 leading-relaxed max-w-2xl mb-5">
                                    {featured.excerpt}
                                </p>
                                <div className="flex items-center gap-2 text-[13px] text-[var(--accent-base)] group-hover:text-[var(--accent-hover)] transition-colors">
                                    Read the analysis <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-mono text-zinc-600">
                                    {featured.author} · {featured.readingTime}
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>
            )}

            {/* Rest */}
            {others.length > 0 && (
                <section className="pb-24 px-6">
                    <div className="mx-auto max-w-3xl">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4 border-b border-white/5 pb-3">
                            More posts
                        </p>
                        <div className="divide-y divide-white/[0.05]">
                            {others.map(post => (
                                <Link
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    className="block py-5 group"
                                >
                                    <div className="flex items-center gap-3 mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                                        <span>{post.category}</span>
                                        <span>·</span>
                                        <time dateTime={post.publishedAt}>
                                            {formatDate(post.publishedAt)}
                                        </time>
                                        <span>·</span>
                                        <span className="text-zinc-600">{post.readingTime}</span>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-medium tracking-tight text-white mb-1.5 group-hover:text-[var(--accent-base)] transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-[13.5px] text-zinc-500 leading-relaxed max-w-2xl">
                                        {post.excerpt}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
