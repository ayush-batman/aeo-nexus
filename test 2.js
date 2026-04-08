require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('scheduled_scans')
    .insert({
      workspace_id: '68fccfd4-47c3-4d64-8ab3-77d341b52e05', // dummy valid uuid
      prompt: 'test direct node',
      platforms: ['chatgpt'],
      status: 'active'
    })
    .select();

  console.log("Insert result error:", error);
  console.log("Insert data:", data);
}
check();
