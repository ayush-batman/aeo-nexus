import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { searchForums } from '../lib/integrations/google-search-client';
import { searchStackExchange } from '../lib/integrations/stackexchange-client';
import { searchHN } from '../lib/integrations/hackernews-client';
import { searchYouTube } from '../lib/integrations/youtube-client';

async function testAll() {
    try {
        console.log("1. Testing YouTube API...");
        const ytRes = await searchYouTube('best dashcam 2026', { maxResults: 3 });
        console.log(`Found ${ytRes.videos.length} YouTube videos.`);
        ytRes.videos.forEach((v: any) => console.log(`- ${v.title}`));

        console.log("\n2. Testing Google Custom Search (Quora, etc)...");
        const cseRes = await searchForums('best dashcam', { limit: 3 });
        console.log(`Found ${cseRes.results.length} CSE results.`);
        cseRes.results.forEach((r: any) => console.log(`- [${r.platform}] ${r.title}`));

        console.log("\n3. Testing StackExchange API...");
        const seRes = await searchStackExchange('dashcam', { pageSize: 3 });
        console.log(`Found ${seRes.questions.length} StackExchange questions.`);
        seRes.questions.forEach((q: any) => console.log(`- ${q.title}`));

        console.log("\n4. Testing HackerNews API...");
        const hnRes = await searchHN('dashcam', { hitsPerPage: 3 });
        console.log(`Found ${hnRes.stories.length} HN stories.`);
        hnRes.stories.forEach((s: any) => console.log(`- ${s.title}`));

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testAll();
