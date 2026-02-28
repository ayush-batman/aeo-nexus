import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { searchReddit } from '../lib/integrations/reddit-client';
import { searchYouTube } from '../lib/integrations/youtube-client';
import { searchHN, convertHNToThreadFormat } from '../lib/integrations/hackernews-client';
import { searchStackExchange, convertSOToThreadFormat } from '../lib/integrations/stackexchange-client';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Same mapping as route.ts
const DB_SAFE_PLATFORMS: Record<string, string> = {
    'reddit': 'reddit',
    'youtube': 'other',
    'quora': 'quora',
    'teambhp': 'teambhp',
    'xbhp': 'xbhp',
    'hackernews': 'other',
    'stackoverflow': 'other',
    'web': 'other',
};

async function run() {
    console.log('=== FULL E2E DISCOVERY TEST (with platform mapping) ===');

    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
    if (!workspaces?.length) { console.log('❌ No workspaces!'); return; }
    const workspaceId = workspaces[0].id;
    console.log('Workspace:', workspaceId);

    const query = 'dashcam';
    const keywords = ['dashcam'];
    const allThreads: any[] = [];

    // 1. Reddit
    console.log('\n1. Fetching Reddit...');
    try {
        const res = await searchReddit(query, { limit: 5 });
        const processed = res.posts
            .filter((p: any) => !p.isLocked && !p.over18)
            .map((post: any) => ({
                platform: 'reddit',
                external_id: post.id,
                title: post.title,
                url: post.url,
                subreddit: post.subreddit,
                score: post.score,
                num_comments: post.numComments,
                opportunity_score: 50,
            }));
        allThreads.push(...processed);
        console.log(`  ✅ ${processed.length} Reddit posts`);
    } catch (e: any) { console.log(`  ❌ Reddit: ${e.message}`); }

    // 2. YouTube
    console.log('2. Fetching YouTube...');
    try {
        const res = await searchYouTube(query, { maxResults: 3 });
        const processed = res.videos.map((v: any) => ({
            platform: 'youtube',
            external_id: v.id,
            title: v.title,
            url: v.url,
            subreddit: v.channelTitle,
            score: v.viewCount || 0,
            num_comments: v.commentCount || 0,
            opportunity_score: 60,
        }));
        allThreads.push(...processed);
        console.log(`  ✅ ${processed.length} YouTube videos`);
    } catch (e: any) { console.log(`  ❌ YouTube: ${e.message}`); }

    // 3. HackerNews
    console.log('3. Fetching HackerNews...');
    try {
        const res = await searchHN(query, { hitsPerPage: 3 });
        const processed = convertHNToThreadFormat(res.stories, keywords);
        allThreads.push(...processed);
        console.log(`  ✅ ${processed.length} HN stories`);
    } catch (e: any) { console.log(`  ❌ HN: ${e.message}`); }

    // 4. StackExchange
    console.log('4. Fetching StackExchange...');
    try {
        const res = await searchStackExchange(query, { pageSize: 3 });
        const processed = convertSOToThreadFormat(res.questions, keywords);
        allThreads.push(...processed);
        console.log(`  ✅ ${processed.length} SE questions`);
    } catch (e: any) { console.log(`  ❌ SE: ${e.message}`); }

    console.log(`\nTotal threads to insert: ${allThreads.length}`);

    // Insert with platform mapping
    let saved = 0;
    let failed = 0;
    for (const item of allThreads) {
        const dbPlatform = DB_SAFE_PLATFORMS[item.platform] || 'other';
        const displayLabel = item.subreddit || item.platform;

        const { data, error } = await supabase
            .from('forum_threads')
            .upsert({
                workspace_id: workspaceId,
                platform: dbPlatform,
                external_id: item.external_id,
                title: item.title,
                url: item.url,
                subreddit: displayLabel,
                score: item.score || 0,
                num_comments: item.num_comments || 0,
                opportunity_score: item.opportunity_score || 0,
                status: 'discovered',
            }, {
                onConflict: 'workspace_id,platform,external_id',
                ignoreDuplicates: false,
            })
            .select()
            .single();

        if (error) {
            console.error(`  ❌ [${item.platform}→${dbPlatform}] ${item.title.substring(0, 50)}: ${error.message}`);
            failed++;
        } else {
            console.log(`  ✅ [${item.platform}→${dbPlatform}] ${item.title.substring(0, 50)}`);
            saved++;
        }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`✅ Saved: ${saved} / ${allThreads.length}`);
    console.log(`❌ Failed: ${failed}`);

    // Verify
    const { data: verify } = await supabase
        .from('forum_threads')
        .select('id, title, platform, subreddit')
        .eq('workspace_id', workspaceId)
        .order('opportunity_score', { ascending: false })
        .limit(20);

    console.log(`\nTotal threads in DB for workspace: ${verify?.length}`);
    verify?.forEach(t => console.log(`  [${t.platform}] (${t.subreddit}) ${t.title.substring(0, 55)}`));
}

run().catch(e => console.error('Fatal:', e));
