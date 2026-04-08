require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    const { data, error } = await supabase.from('scheduled_scans').select('*').limit(1);
    if (error) {
        console.error("DB Error:", error.message);
    } else {
        console.log("Success! Table exists. Rows:", data.length);
    }
}

test();
