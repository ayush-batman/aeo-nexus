import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    console.log("Testing DB Insert...");
    const { data, error } = await supabase
        .from('forum_threads')
        .upsert({
            workspace_id: '12345678-1234-1234-1234-123456789012', // Valid UUID
            platform: 'test',
            external_id: 'test-123',
            title: 'Test Thread',
            url: 'https://test.com',
            score: 10,
            num_comments: 5,
            opportunity_score: 95,
            status: 'discovered',
            external_created_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("DB Success:", data[0].id);
        await supabase.from('forum_threads').delete().eq('external_id', 'test-123');
    }
}
test();
