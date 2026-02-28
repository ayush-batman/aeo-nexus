import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/private/', '/api/', '/dashboard/'],
        },
        sitemap: 'https://aeo-saas-chi.vercel.app/sitemap.xml',
    };
}
