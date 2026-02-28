import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import robotsParser from 'robots-parser';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

        let targetUrl;
        try {
            targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        const domain = targetUrl.origin;
        const fullUrl = targetUrl.href;

        // 1. Check robots.txt
        const robotsUrl = `${domain}/robots.txt`;
        let robotsStatus = 'missing'; // 'found', 'missing', 'error'
        let aiBotsBlocked = false;
        let details: any[] = [];
        let sitemaps: string[] = [];

        try {
            const robotsRes = await fetch(robotsUrl, {
                next: { revalidate: 3600 },
                headers: { 'User-Agent': 'AEO-Nexus-Audit/1.0' }
            });

            if (robotsRes.ok) {
                robotsStatus = 'found';
                const robotsTxt = await robotsRes.text();
                const robots = robotsParser(robotsUrl, robotsTxt);

                sitemaps = robots.getSitemaps();

                const bots = [
                    'GPTBot',
                    'CCBot',
                    'Google-Extended',
                    'AnthropicAI',
                    'Claude-Web',
                    'Omgilibot',
                    'FacebookBot',
                    'Applebot-Extended'
                ];

                for (const bot of bots) {
                    const allowed = robots.isAllowed(fullUrl, bot);
                    // robots-parser returns boolean or undefined. undefined usually means allowed.
                    const isAllowed = allowed !== false;

                    details.push({ bot, allowed: isAllowed });
                    if (!isAllowed) aiBotsBlocked = true;
                }
            } else {
                robotsStatus = 'missing';
            }
        } catch (e) {
            console.error('Robots fetch error:', e);
            robotsStatus = 'error';
        }

        // 2. Check Meta Tags
        let metaTags: any[] = [];
        try {
            const pageRes = await fetch(fullUrl, {
                headers: { 'User-Agent': 'AEO-Nexus-Audit-Bot/1.0' }
            });

            if (pageRes.ok) {
                const html = await pageRes.text();
                const $ = cheerio.load(html);

                $('meta').each((i, el) => {
                    const name = $(el).attr('name') || $(el).attr('property');
                    const content = $(el).attr('content');

                    if (name && content) {
                        const lowerName = name.toLowerCase();
                        if (lowerName.includes('robots') || lowerName.includes('googlebot')) {
                            metaTags.push({ name, content });
                            if (content.toLowerCase().includes('noai') || content.toLowerCase().includes('noimageai')) {
                                aiBotsBlocked = true;
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Page fetch error:', e);
        }

        return NextResponse.json({
            robotsStatus,
            aiBotsBlocked,
            details,
            metaTags,
            sitemaps,
            checkedUrl: fullUrl
        });

    } catch (e) {
        console.error('Audit API Error:', e);
        return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
    }
}
