import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { searchReddit } from '../lib/integrations/reddit-client';
import { createAdminClient } from '../lib/supabase/admin';

async function test() {
    console.log("Mocking Discovery...");
    const res = await searchReddit('dashcam', { limit: 5 });
    console.log(`Found ${res.posts.length} Reddit posts`);

    if (res.posts.length === 0) return;

    const supabaseAdmin = createAdminClient();
    const workspaceId = '0b2302bd-2957-41e9-906d-55bfa22bbff7';

    try {
        const item = res.posts[0];
        const { data, error } = await supabaseAdmin
            .from('forum_threads')
            .upsert({
                workspace_id: workspaceId,
                title: item.title,
                url: item.url,
                subreddit: item.subreddit,
                platform: item.platform,
                external_id: item.external_id,
                score: item.score,
                num_comments: item.num_comments,
                opportunity_score: item.opportunity_score,
                status: 'discovered',
                external_created_at: item.created_at,
            }, {
                onConflict: 'workspace_id,platform,external_id',
                ignoreDuplicates: false,
            })
            .select()
            .single();

        if (error) {
            console.error("DB Error:", error);
        } else {
            console.log("DB Success! Saved:", data.title);
        }
    } catch (e) {
        console.error("Fatal:", e);
    }
}
test();
