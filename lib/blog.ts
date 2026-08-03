// Blog registry — each post is a self-contained module with front-matter
// exported from the post's own page.tsx. This registry gives the index
// page + sitemap the structured metadata without duplicating it.

export interface BlogPost {
    slug:        string;
    title:       string;
    excerpt:     string;
    publishedAt: string;   // ISO date
    readingTime: string;   // "6 min read"
    category:    'Analysis' | 'Field notes' | 'Methodology' | 'Product';
    author:      string;
    featured?:   boolean;
}

// Newest first.
export const POSTS: BlogPost[] = [
    {
        slug:        'best-ai-visibility-tools-2026',
        title:       'The best AI visibility tools in 2026 (an honest comparison)',
        excerpt:     'Profound, Peec, Otterly, the Semrush and Ahrefs add-ons, and where Aelo fits. A straight comparison of the tools that track how ChatGPT, Gemini, Claude and Perplexity talk about your brand, and what each one is actually best at.',
        publishedAt: '2026-08-03',
        readingTime: '8 min read',
        category:    'Analysis',
        author:      'Aelo Research',
        featured:    true,
    },
    {
        slug:        'the-16-sources-llms-actually-cite',
        title:       'The 16 sources LLMs actually cite',
        excerpt:     'Reddit at #1 for consumer + prosumer queries. G2 dominates B2B software. YouTube transcripts feed Gemini heavily. A ranked, per-LLM breakdown of where AI answers actually source their information.',
        publishedAt: '2026-07-06',
        readingTime: '9 min read',
        category:    'Analysis',
        author:      'Aelo Research',
    },
    {
        slug:        'india-ai-visibility-index-july-2026',
        title:       'The India AI Visibility Index — July 2026 Preview',
        excerpt:     'Zoho holds a 100% mention rate for Indian CRM queries. Byju\'s doesn\'t appear once for EdTech intent. Six brands, six categories, one Gemini pass — the receipts behind the first India AI Visibility Index.',
        publishedAt: '2026-07-05',
        readingTime: '7 min read',
        category:    'Analysis',
        author:      'Aelo Research',
        featured:    true,
    },
    {
        slug:        'why-zero-is-honest',
        title:       'Why zero is honest',
        excerpt:     'Every AI-visibility tool wants to show you a nice green number. Aelo will show you a zero if that\'s what the LLMs said. Here\'s why that\'s better for you.',
        publishedAt: '2026-07-05',
        readingTime: '3 min read',
        category:    'Methodology',
        author:      'Aelo Research',
    },
    {
        slug:        'the-receipt-is-the-product',
        title:       'The receipt is the product',
        excerpt:     'Every derived number in Aelo is one click away from the raw scan that produced it. This isn\'t a feature — it\'s the entire thesis.',
        publishedAt: '2026-07-05',
        readingTime: '4 min read',
        category:    'Product',
        author:      'Aelo Research',
    },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
    return POSTS.find(p => p.slug === slug);
}
