import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getForumThreads } from '../lib/data-access';

async function test() {
    const workspaceId = '0b2302bd-2957-41e9-906d-55bfa22bbff7'; // known test workspace
    try {
        console.log("Calling getForumThreads directly with admin override enabled...");
        const threads = await getForumThreads(workspaceId, { limit: 10 });
        console.log(`Successfully fetched ${threads.length} threads bypassing RLS!`);
        if(threads.length > 0) {
           console.log("Sample:", threads[0].title);
        }
    } catch(e) {
        console.error("Fetch failed:", e);
    }
}
test();
