import { MetadataRoute } from 'next';

// robots.txt with an explicit carve-out for the public India Index API
// (so crawlers can discover our public receipts) and standard denies for
// authenticated surfaces.

const DEFAULT_BASE = 'https://aelo.sh';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_BASE).replace(/\/$/, '');
    return {
        rules: {
            userAgent: '*',
            allow: [
                '/',
                '/api/india-index/',  // Public trust artefact — indexable
            ],
            disallow: [
                '/private/',
                '/api/',              // Everything else under /api/ stays private
                '/dashboard/',
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
