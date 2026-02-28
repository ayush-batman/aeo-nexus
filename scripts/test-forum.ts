import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { searchReddit } from '../lib/integrations/reddit-client';

async function testReddit() {
    try {
        console.log('Testing Reddit API...');
        const res = await searchReddit('dashcam', { limit: 5, time: 'all' as any });
        console.log(`Found ${res.posts.length} posts`);
        res.posts.forEach((p: any) => console.log(`- ${p.title} (${p.url})`));
    } catch (e) {
        console.error('Reddit API Error:', e);
    }
}

testReddit();
