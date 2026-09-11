'use node';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { api, internal } from './_generated/api';
import { forumDocument } from './records';
import { searchReddit, getSubredditPosts, calculateOpportunityScore, isRedditConfigured } from '../lib/integrations/reddit-client';
import { searchYouTube, calculateYouTubeOpportunityScore } from '../lib/integrations/youtube-client';
import { searchForums, isGoogleSearchConfigured, convertToThreadFormat } from '../lib/integrations/google-search-client';
import { searchStackExchange, convertSOToThreadFormat } from '../lib/integrations/stackexchange-client';
import { searchHN, convertHNToThreadFormat } from '../lib/integrations/hackernews-client';
import { discoverIndustrySources } from '../lib/services/source-discovery';
import type { Doc } from './_generated/dataModel';

const googleSites: Record<string, string> = { quora: 'quora.com', g2: 'g2.com', capterra: 'capterra.com', trustradius: 'trustradius.com',
  trustpilot: 'trustpilot.com', softwareadvice: 'softwareadvice.com', medium: 'medium.com', devto: 'dev.to', substack: 'substack.com',
  producthunt: 'producthunt.com', alternativeto: 'alternativeto.net', github: 'github.com' };
const sortValidator = v.union(v.literal('relevance'), v.literal('hot'), v.literal('new'), v.literal('top'));
const timeValidator = v.union(v.literal('hour'), v.literal('day'), v.literal('week'), v.literal('month'), v.literal('year'), v.literal('all'));
function sources() {
  const google = isGoogleSearchConfigured();
  return { reddit: isRedditConfigured(), youtube: !!process.env.YOUTUBE_API_KEY, stackoverflow: true, hackernews: true,
    ...Object.fromEntries(Object.keys(googleSites).map(key => [key, google])) };
}
export const configuration = action({
  args: { workspaceId: v.string() }, returns: v.object({ sources: v.record(v.string(), v.boolean()), activeCount: v.number(), message: v.string() }),
  handler: async (ctx, args) => {
    await ctx.runQuery(api.workspaces.get, args);
    const configured = sources(); const activeCount = Object.values(configured).filter(Boolean).length;
    return { sources: configured, activeCount, message: `${activeCount} sources configured; availability is checked during discovery.` };
  },
});
type Discovered = { platform: string; external_id: string; title: string; url: string; subreddit: string | null; author: string | null;
  score: number; num_comments: number; opportunity_score: number; created_at: string };
export const discover = action({
  args: { workspaceId: v.string(), query: v.optional(v.string()), subreddits: v.optional(v.array(v.string())), keywords: v.optional(v.array(v.string())),
    sort: v.optional(sortValidator), time: v.optional(timeValidator), limit: v.optional(v.number()), platforms: v.optional(v.array(v.string())) },
  returns: v.object({ success: v.boolean(), discovered: v.number(), saved: v.number(), threads: v.array(forumDocument),
    sourceStatus: v.record(v.string(), v.string()), warnings: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const { query = '', subreddits = [], keywords = [], sort = 'relevance', time = 'month', limit = 25, platforms = [] } = args;
    if ((!query.trim() && !subreddits.length) || query.length > 500 || subreddits.length > 10 || subreddits.some(s => !/^[a-z0-9_]{1,50}$/i.test(s)) ||
      keywords.length > 20 || keywords.some(s => s.length > 100) || !Number.isInteger(limit) || limit < 1 || limit > 50 ||
      platforms.length > 20 || platforms.some(p => !['reddit', 'youtube', 'stackoverflow', 'hackernews', 'google', ...Object.keys(googleSites)].includes(p))) throw new Error('invalid_discovery');
    await ctx.runMutation(internal.forum.authorizeDiscovery, { workspaceId: args.workspaceId });
    const configured = sources(), sourceStatus: Record<string, string> = {}, all: Discovered[] = [];
    const wants = (p: string) => !platforms.length || platforms.includes(p);
    const jobs: Promise<void>[] = [];
    const run = (source: string, enabled: boolean, search: () => Promise<Discovered[]>) => {
      if (!enabled) { sourceStatus[source] = 'not_configured'; return; }
      jobs.push(search().then(rows => { all.push(...rows); sourceStatus[source] = rows.length ? 'ok' : 'empty'; })
        .catch(() => { sourceStatus[source] = 'failed'; }));
    };
    if (wants('reddit')) run('reddit', configured.reddit, async () => {
      const posts = query ? (await searchReddit(query, { subreddits, sort, time, limit })).posts :
        (await Promise.all(subreddits.map(sub => getSubredditPosts(sub, { sort: sort === 'relevance' ? 'hot' : sort, time, limit: Math.max(1, Math.floor(limit / subreddits.length)) })))).flat();
      return posts.filter(p => !p.isLocked && !p.over18).map(p => ({ platform: 'reddit', external_id: p.id, title: p.title,
        url: p.permalink.startsWith('/') ? `https://www.reddit.com${p.permalink}` : p.url, subreddit: p.subreddit, author: p.author,
        score: p.score, num_comments: p.numComments, opportunity_score: calculateOpportunityScore(p, keywords), created_at: new Date(p.createdUtc * 1000).toISOString() }));
    });
    const searchQuery = query || keywords.join(' ');
    if (searchQuery && wants('youtube')) run('youtube', configured.youtube, async () => (await searchYouTube(searchQuery, { maxResults: limit })).videos.map(p => ({
      platform: 'youtube', external_id: p.id, title: p.title, url: p.url, subreddit: p.channelTitle, author: p.channelTitle,
      score: p.viewCount || 0, num_comments: p.commentCount || 0, opportunity_score: calculateYouTubeOpportunityScore(p, keywords), created_at: p.publishedAt })));
    if (searchQuery && wants('stackoverflow')) run('stackoverflow', true, async () => convertSOToThreadFormat((await searchStackExchange(searchQuery, { pageSize: Math.min(limit, 20) })).questions, keywords));
    if (searchQuery && wants('hackernews')) run('hackernews', true, async () => convertHNToThreadFormat((await searchHN(searchQuery, { hitsPerPage: Math.min(limit, 20) })).stories, keywords));
    const selectedSites = platforms.filter(p => googleSites[p]).map(p => googleSites[p]);
    if (searchQuery && (wants('google') || selectedSites.length)) run('google', isGoogleSearchConfigured(), async () =>
      convertToThreadFormat((await searchForums(searchQuery, { limit: 10, ...(selectedSites.length && !platforms.includes('google') ? { sites: selectedSites } : {}) })).results, keywords));
    await Promise.all(jobs);
    // URL paths can be case-sensitive. Never lowercase the complete URL.
    const seen = new Set<string>();
    const unique = all.filter(row => { try { const key = new URL(row.url).href; if (seen.has(key)) return false; seen.add(key); return true; } catch { return false; } })
      .sort((a, b) => b.opportunity_score - a.opportunity_score).slice(0, 100);
    const threads: Doc<'forumThreads'>[] = [], warnings: string[] = [];
    for (const row of unique) {
      try { threads.push(await ctx.runMutation(api.forum.save, { workspaceId: args.workspaceId, thread: {
        platform: row.platform, externalId: row.external_id, title: row.title, url: row.url, subreddit: row.subreddit || row.platform,
        author: row.author || undefined, score: row.score, numComments: row.num_comments, opportunityScore: row.opportunity_score,
        ...(Number.isFinite(Date.parse(row.created_at)) ? { externalCreatedAt: Date.parse(row.created_at) } : {}),
      } })); } catch { warnings.push('Some discovered threads could not be saved. Check your plan limit and retry.'); break; }
    }
    for (const [source, status] of Object.entries(sourceStatus)) if (status === 'failed' || status === 'not_configured') warnings.push(`${source}: ${status.replace('_', ' ')}.`);
    return { success: Object.values(sourceStatus).some(s => s === 'ok' || s === 'empty'), discovered: unique.length, saved: threads.length, threads, sourceStatus, warnings };
  },
});
export const suggest = action({
  args: { workspaceId: v.string(), industry: v.string(), targetAudience: v.string(), productName: v.optional(v.string()) },
  returns: v.object({ subreddits: v.array(v.string()), youtubeKeywords: v.array(v.string()), otherForums: v.array(v.string()) }),
  handler: async (ctx, args) => {
    if (!args.industry.trim() || args.industry.length > 300 || args.targetAudience.length > 1000 || (args.productName?.length ?? 0) > 200) throw new Error('invalid_discovery');
    await ctx.runMutation(internal.forum.authorizeDiscovery, { workspaceId: args.workspaceId });
    return discoverIndustrySources(args.industry, args.targetAudience, args.productName);
  },
});
