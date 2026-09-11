import robotsParser from 'robots-parser';
import * as cheerio from 'cheerio';
import { safeFetchText } from '../security/safe-fetch';

export function auditUrl(input: string) {
  if (!input.trim() || input.length > 2048) throw new Error('invalid_website');
  const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid_website');
  return url;
}
export async function technicalAudit(input: string) {
  const target = auditUrl(input), robotsUrl = new URL('/robots.txt', target).href;
  const [robotsResponse, page] = await Promise.all([
    safeFetchText(robotsUrl, { timeoutMs: 8000, maxBytes: 256000 }).catch(() => null),
    safeFetchText(target.href, { timeoutMs: 10000, maxBytes: 1000000 }),
  ]);
  if (!page.ok) throw new Error('audit_page_unavailable');
  // Denial, timeout and server failure are not evidence of an absent file.
  if (!robotsResponse || (!robotsResponse.ok && robotsResponse.status !== 404 && robotsResponse.status !== 410)) throw new Error('audit_robots_unavailable');
  const robots = robotsParser(robotsUrl, robotsResponse.ok ? robotsResponse.text : '');
  const bots = ['GPTBot', 'CCBot', 'Google-Extended', 'AnthropicAI', 'Claude-Web', 'Omgilibot', 'FacebookBot', 'Applebot-Extended'];
  const details = bots.map(bot => ({ bot, allowed: robots.isAllowed(target.href, bot) !== false }));
  const $ = cheerio.load(page.text), metaTags: { name: string; content: string }[] = [];
  $('meta').each((_, element) => {
    const name = $(element).attr('name') || $(element).attr('property'), content = $(element).attr('content');
    if (name && content && /robots|googlebot/i.test(name) && metaTags.length < 100) metaTags.push({ name: name.slice(0, 200), content: content.slice(0, 2000) });
  });
  return { robotsStatus: robotsResponse.ok ? 'found' : 'missing', aiBotsBlocked: details.some(bot => !bot.allowed), details, metaTags,
    sitemaps: robots.getSitemaps().filter(s => /^https?:\/\//i.test(s)).slice(0, 100), checkedUrl: target.href,
    fetchedUrl: page.url, evidenceStatus: 'fetched_configuration',
    note: 'Rules for the listed user-agent names on this URL only. Training bots and answer-search bots have different purposes. These rules do not prove actual visits, access through other routes, or future citations. Meta directives are reported separately, not assumed to be universally supported.' };
}
