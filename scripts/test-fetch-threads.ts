import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    console.log("Fetching all threads...");
    const { data, error } = await supabase
        .from('forum_threads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log(`Found ${data.length} threads total in DB.`);
        if (data.length > 0) {
            console.log("Sample:", data[0]);
        }
    }
}
test();
