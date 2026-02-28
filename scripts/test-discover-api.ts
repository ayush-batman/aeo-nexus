import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { searchReddit } from '../lib/integrations/reddit-client';

async function test() {
    try {
        const res = await searchReddit('dashcam', { subreddits: ['cars', 'dashcam'], time: 'month' });
        console.log(`Found ${res.posts.length} posts`);
        res.posts.slice(0, 3).forEach((p: any) => console.log(p.title));
    } catch (e) {
        console.error(e);
    }
}
test();
