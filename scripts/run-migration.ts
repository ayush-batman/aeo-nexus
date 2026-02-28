import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use the Supabase Management API to run SQL
// The SQL endpoint is at /pg/query for direct SQL execution on Supabase
async function runMigration() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Approach 1: Try Supabase's pg endpoint
    const sql = `
        ALTER TABLE public.forum_threads
        DROP CONSTRAINT IF EXISTS forum_threads_platform_check;
        
        ALTER TABLE public.forum_threads
        ADD CONSTRAINT forum_threads_platform_check
        CHECK (platform IN ('reddit', 'quora', 'teambhp', 'xbhp', 'youtube', 'hackernews', 'stackoverflow', 'web', 'other'));
    `;

    console.log('Attempting to run migration via Supabase pg/query endpoint...');

    // Try the /pg endpoint (available on newer Supabase versions)
    const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });

    if (pgRes.ok) {
        console.log('✅ Migration succeeded via pg/query!');
        const data = await pgRes.json();
        console.log('Response:', JSON.stringify(data));
    } else {
        const errText = await pgRes.text();
        console.log(`pg/query failed (${pgRes.status}): ${errText}`);

        // Approach 2: Use the database URL directly with fetch
        console.log('\nAttempting via Supabase SQL endpoint...');

        // Extract project ref from URL
        const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
        console.log('Project ref:', projectRef);

        // Try the management API
        const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
        });

        if (mgmtRes.ok) {
            console.log('✅ Migration succeeded via management API!');
        } else {
            const errText2 = await mgmtRes.text();
            console.log(`Management API failed (${mgmtRes.status}): ${errText2}`);

            console.log('\n❌ Could not run migration automatically.');
            console.log('Please run this SQL in the Supabase Dashboard SQL Editor:');
            console.log('URL: https://supabase.com/dashboard/project/vfdnvnevsfszuhmmjqgy/sql');
            console.log('\n--- COPY THE SQL BELOW ---');
            console.log(sql);
            console.log('--- END SQL ---');
        }
    }

    // Quick test to see if it worked
    console.log('\nTesting if constraint is updated...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const testId = 'constraint-test-' + Date.now();
    const { error } = await supabase
        .from('forum_threads')
        .upsert({
            workspace_id: '1a03d598-bc48-4775-b8f5-fdba6049e577',
            platform: 'hackernews',
            external_id: testId,
            title: 'Constraint Test',
            url: 'https://news.ycombinator.com/test',
            status: 'discovered',
        }, { onConflict: 'workspace_id,platform,external_id' })
        .select()
        .single();

    if (error?.message?.includes('platform_check')) {
        console.log('❌ Constraint still blocks hackernews. Migration not applied yet.');
    } else if (error) {
        console.log('❌ Other error:', error.message);
    } else {
        console.log('✅ hackernews platform now accepted! Migration successful!');
        await supabase.from('forum_threads').delete().match({ external_id: testId });
    }
}

runMigration().catch(console.error);
