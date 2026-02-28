
import { searchReddit, getSubredditPosts } from '../lib/integrations/reddit-client';

async function main() {
    console.log('Testing Reddit Public Access...');

    try {
        // Test 1: Subreddit Posts
        console.log('\nFetching generic /r/marketing posts...');
        const posts = await getSubredditPosts('marketing', { limit: 5 });
        console.log(`Success! Found ${posts.length} posts.`);
        if (posts.length > 0) {
            console.log('Sample Post:', posts[0].title);
        }

        // Test 2: Search
        console.log('\nSearching for "SEO tools"...');
        const searchResults = await searchReddit('SEO tools', { limit: 5 });
        console.log(`Success! Found ${searchResults.posts.length} results.`);
        if (searchResults.posts.length > 0) {
            console.log('Sample Result:', searchResults.posts[0].title);
        }

    } catch (error) {
        console.error('Error during test:', error);
    }
}

main();
