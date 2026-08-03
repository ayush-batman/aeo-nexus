import { MetadataRoute } from 'next';

// Sitemap for search + AI-crawler discovery. Priorities are set to reflect
// the marketing intent hierarchy (India Index + methodology + product are
// top-of-funnel high-signal pages; legal + auth are low-priority).
//
// baseUrl is env-overridable so production deploys don't leak the
// preview domain into indexed sitemaps.

const DEFAULT_BASE = 'https://aelohq.com';

const routes: {
    path:     string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] = [
    // Landing + primary product surface
    { path: '',              priority: 1.0, changeFrequency: 'weekly'  },
    { path: '/product',      priority: 0.9, changeFrequency: 'weekly'  },
    { path: '/pricing',      priority: 0.9, changeFrequency: 'weekly'  },

    // PR + trust pages (Sage bets)
    { path: '/india-index',  priority: 0.95, changeFrequency: 'weekly' },
    { path: '/methodology',  priority: 0.9,  changeFrequency: 'monthly'},
    { path: '/manifesto',    priority: 0.85, changeFrequency: 'monthly'},

    // Solutions (targeted landing pages)
    { path: '/solutions/founders',  priority: 0.8, changeFrequency: 'monthly' },
    { path: '/solutions/marketing', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/solutions/agencies',  priority: 0.8, changeFrequency: 'monthly' },
    { path: '/solutions/india',     priority: 0.85, changeFrequency: 'monthly'},

    // Reference + editorial
    { path: '/docs',         priority: 0.85, changeFrequency: 'weekly'  },
    { path: '/blog',                                                priority: 0.85, changeFrequency: 'weekly' },
    { path: '/blog/answer-engine-optimization-guide',               priority: 0.95, changeFrequency: 'monthly' },
    { path: '/blog/profound-alternative',                           priority: 0.9,  changeFrequency: 'monthly' },
    { path: '/blog/best-ai-visibility-tools-2026',                  priority: 0.9,  changeFrequency: 'monthly' },
    { path: '/blog/the-16-sources-llms-actually-cite',              priority: 0.9,  changeFrequency: 'yearly' },
    { path: '/blog/india-ai-visibility-index-july-2026',            priority: 0.9,  changeFrequency: 'yearly' },
    { path: '/blog/why-zero-is-honest',                             priority: 0.7,  changeFrequency: 'yearly' },
    { path: '/blog/the-receipt-is-the-product',                     priority: 0.7,  changeFrequency: 'yearly' },
    { path: '/changelog',    priority: 0.7,  changeFrequency: 'weekly'  },
    { path: '/customers',    priority: 0.7,  changeFrequency: 'monthly' },
    { path: '/about',        priority: 0.7,  changeFrequency: 'monthly' },
    { path: '/brand',        priority: 0.6,  changeFrequency: 'yearly' },
    { path: '/contact',      priority: 0.7,  changeFrequency: 'yearly'  },

    // Legal
    { path: '/privacy',      priority: 0.4,  changeFrequency: 'yearly'  },
    { path: '/terms',        priority: 0.4,  changeFrequency: 'yearly'  },
    { path: '/security',     priority: 0.4,  changeFrequency: 'yearly'  },

    // Auth (indexable but low priority)
    { path: '/login',        priority: 0.5,  changeFrequency: 'yearly'  },
    { path: '/signup',       priority: 0.6,  changeFrequency: 'yearly'  },
];

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_BASE).replace(/\/$/, '');
    const now = new Date();

    return routes.map(r => ({
        url:            `${baseUrl}${r.path}`,
        lastModified:   now,
        changeFrequency: r.changeFrequency,
        priority:       r.priority,
    }));
}
