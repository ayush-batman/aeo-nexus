import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('=== FULL PIPELINE DIAGNOSTIC ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', serviceRoleKey ? `${serviceRoleKey.substring(0, 15)}... (${serviceRoleKey.length} chars)` : 'MISSING!');
console.log('YouTube API Key:', process.env.YOUTUBE_API_KEY ? 'SET' : 'MISSING');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
    // Step 1: List workspaces
    console.log('\n--- Step 1: List workspaces ---');
    const { data: workspaces, error: wsErr } = await supabase
        .from('workspaces')
        .select('id, name, org_id')
        .limit(5);

    if (wsErr) { console.error('Workspace error:', wsErr); return; }
    console.log('Workspaces found:', workspaces?.length);
    workspaces?.forEach(w => console.log(`  - ${w.id} | ${w.name} | org: ${w.org_id}`));

    if (!workspaces || workspaces.length === 0) {
        console.log('❌ NO WORKSPACES FOUND - this means no user has completed onboarding');
        return;
    }

    const workspaceId = workspaces[0].id;

    // Step 2: Check existing threads
    console.log('\n--- Step 2: Check existing threads ---');
    const { data: existing, error: existErr } = await supabase
        .from('forum_threads')
        .select('id, title, platform, workspace_id')
        .limit(5);

    if (existErr) console.error('Thread fetch error:', existErr);
    else {
        console.log(`Total threads in DB: ${existing?.length || 0}`);
        existing?.forEach(t => console.log(`  - [${t.platform}] ${t.title} (ws: ${t.workspace_id})`));
    }

    // Step 3: Test minimal insert
    console.log('\n--- Step 3: Test minimal insert ---');
    const testId = 'diag-' + Date.now();
    const { data: ins, error: insErr } = await supabase
        .from('forum_threads')
        .upsert({
            workspace_id: workspaceId,
            platform: 'reddit',
            external_id: testId,
            title: 'Diagnostic Test Thread',
            url: 'https://reddit.com/r/test/' + testId,
            status: 'discovered',
        }, {
            onConflict: 'workspace_id,platform,external_id',
        })
        .select()
        .single();

    if (insErr) {
        console.error('❌ MINIMAL INSERT FAILED:', insErr);
    } else {
        console.log('✅ MINIMAL INSERT SUCCESS:', ins.id);
    }

    // Step 4: Test full insert (all fields route.ts uses)
    console.log('\n--- Step 4: Test full insert (all route.ts fields) ---');
    const testId2 = 'diag-full-' + Date.now();
    const { data: ins2, error: insErr2 } = await supabase
        .from('forum_threads')
        .upsert({
            workspace_id: workspaceId,
            platform: 'youtube',
            external_id: testId2,
            title: 'Full Field Diagnostic Thread',
            url: 'https://youtube.com/watch?v=' + testId2,
            subreddit: 'TechChannel',
            score: 1000,
            num_comments: 50,
            opportunity_score: 85,
            status: 'discovered',
            external_created_at: new Date().toISOString(),
        }, {
            onConflict: 'workspace_id,platform,external_id',
        })
        .select()
        .single();

    if (insErr2) {
        console.error('❌ FULL INSERT FAILED:', insErr2);
    } else {
        console.log('✅ FULL INSERT SUCCESS:', ins2.id);
    }

    // Step 5: Verify both rows exist
    console.log('\n--- Step 5: Verify inserted rows ---');
    const { data: verify, error: verifyErr } = await supabase
        .from('forum_threads')
        .select('id, title, platform')
        .eq('workspace_id', workspaceId)
        .in('external_id', [testId, testId2]);

    if (verifyErr) console.error('Verify error:', verifyErr);
    else {
        console.log(`Found ${verify?.length} of 2 inserted rows`);
        verify?.forEach(v => console.log(`  ✅ [${v.platform}] ${v.title}`));
    }

    // Step 6: Clean up
    console.log('\n--- Step 6: Cleanup ---');
    if (ins?.id) await supabase.from('forum_threads').delete().eq('id', ins.id);
    if (ins2?.id) await supabase.from('forum_threads').delete().eq('id', ins2.id);
    console.log('Cleaned up test rows');

    // Step 7: Check users table
    console.log('\n--- Step 7: Users and auth mapping ---');
    const { data: users } = await supabase
        .from('users')
        .select('id, org_id, onboarding_completed')
        .limit(5);
    console.log('Users:', JSON.stringify(users, null, 2));

    console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

run().catch(e => console.error('Fatal:', e));
