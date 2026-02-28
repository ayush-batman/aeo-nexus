import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log("Starting test...");
  
  // Try inserting with service role
  const { data, error } = await supabase.from('scheduled_scans').insert({
    workspace_id: '68fccfd4-47c3-4d64-8ab3-77d341b52e05', // Try a uuid format
    prompt: 'test direct insert',
    platforms: ['chatgpt'],
    frequency: 'daily',
    status: 'active',
  }).select();
  
  console.log("DB Insert Error:", error);
  console.log("DB Insert Data:", data);
}

test();
