import { POSTS } from "@/lib/blog";
import { NextResponse } from "next/server";

// RSS 2.0 feed for the Aelo blog. Rebuilt per request (cached briefly)
// so new posts appear without a deploy. Consumed by Feedly, Reeder,
// email newsletter tools, and search-engine RSS crawlers.

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aelo.sh").replace(/\/$/, "");

export const revalidate = 3600; // 1 hour

function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export async function GET() {
    const items = POSTS.map(p => {
        const url = `${SITE_URL}/blog/${p.slug}`;
        const pubDate = new Date(p.publishedAt).toUTCString();
        return `
    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.excerpt)}</description>
      <category>${esc(p.category)}</category>
      <author>research@aelo.sh (${esc(p.author)})</author>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    }).join("");

    const lastBuildDate = new Date().toUTCString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Aelo — Analysis, methodology, field notes</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Real numbers with the receipts attached — from Aelo, the honest measurement layer for AI answer visibility.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Aelo</generator>${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
        headers: {
            "Content-Type":  "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
}
