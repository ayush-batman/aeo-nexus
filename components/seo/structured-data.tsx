// JSON-LD helpers. Emit typed structured data via <script type="application/ld+json">
// so search engines + social platforms render rich cards. No runtime cost.

import type { BlogPost } from "@/lib/blog";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aelohq.com").replace(/\/$/, "");

// Base Organization — spread into any page-level entity via sameAs / publisher.
const ORG = {
    "@type":  "Organization",
    name:     "Aelo",
    url:      SITE_URL,
    logo:     `${SITE_URL}/opengraph-image`,
    slogan:   "AI visibility with the receipts to prove every number.",
    sameAs: [
        // Add real handles when they exist. Empty list is honest until then.
    ],
};

function jsonLd(data: Record<string, unknown>) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify({ "@context": "https://schema.org", ...data }),
            }}
        />
    );
}

// ── Site-wide (rendered in root layout) ─────────────────────────────────────
export function OrganizationJsonLd() {
    return jsonLd({ ...ORG });
}

export function WebSiteJsonLd() {
    return jsonLd({
        "@type": "WebSite",
        name:    "Aelo",
        url:     SITE_URL,
        publisher: ORG,
    });
}

// ── Article (blog posts) ────────────────────────────────────────────────────
export function ArticleJsonLd({ post }: { post: BlogPost }) {
    return jsonLd({
        "@type":        "Article",
        headline:       post.title,
        description:    post.excerpt,
        datePublished:  post.publishedAt,
        dateModified:   post.publishedAt,
        author: {
            "@type": "Organization",
            name:    post.author,
            url:     SITE_URL,
        },
        publisher: ORG,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id":   `${SITE_URL}/blog/${post.slug}`,
        },
        articleSection: post.category,
    });
}

// ── SoftwareApplication (for /product + /pricing) ───────────────────────────
export function SoftwareApplicationJsonLd() {
    return jsonLd({
        "@type": "SoftwareApplication",
        name:    "Aelo",
        description: "Track and improve your brand's visibility across ChatGPT, Gemini, Claude, and Perplexity — with the raw receipts behind every number.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: "4999",
            eligibleRegion: "IN",
        },
        publisher: ORG,
        url: `${SITE_URL}/product`,
    });
}

// ── Dataset (for /india-index — it IS a dataset by any honest definition) ──
export function IndiaIndexDatasetJsonLd({ label, brandCount, categoriesTracked }: {
    label: string;
    brandCount: number;
    categoriesTracked: number;
}) {
    return jsonLd({
        "@type":     "Dataset",
        name:        `India AI Visibility Index — ${label}`,
        description: "Monthly measurement of how ChatGPT, Gemini, Claude, and Perplexity answer high-intent queries about Indian brands. Every number links to the raw scan behind it.",
        creator:     ORG,
        distribution: [
            {
                "@type":       "DataDownload",
                encodingFormat: "application/json",
                contentUrl:    `${SITE_URL}/api/india-index`,
            },
        ],
        variableMeasured: [
            "Brand mention rate",
            "Average mention position",
            "Visibility verdict",
        ],
        keywords: [
            "AI visibility",
            "India",
            "AEO",
            "answer engine optimization",
            `${brandCount} brands`,
            `${categoriesTracked} categories`,
        ],
        url: `${SITE_URL}/india-index`,
    });
}

// ── BreadcrumbList (helper for any nested page) ─────────────────────────────
export function BreadcrumbJsonLd({ items }: { items: { label: string; path: string }[] }) {
    return jsonLd({
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
            "@type":  "ListItem",
            position: i + 1,
            name:     it.label,
            item:     `${SITE_URL}${it.path}`,
        })),
    });
}
