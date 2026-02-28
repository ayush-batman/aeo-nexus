
import { discoverIndustrySources } from '../lib/services/source-discovery';

async function main() {
    console.log('Testing Source Discovery with Gemini...');

    if (!process.env.GEMINI_API_KEY) {
        console.error('GENIMNI_API_KEY missing.');
        return;
    }

    try {
        const industry = 'Sustainable Fashion';
        const audience = 'Eco-conscious Gen Z';

        console.log(`\nGenerating sources for: ${industry} (${audience})`);
        const sources = await discoverIndustrySources(industry, audience);

        console.log('\n--- Suggested Sources ---');
        console.log('Subreddits:', sources.subreddits.join(', '));
        console.log('YouTube Keywords:', sources.youtubeKeywords.join(', '));
        console.log('Other Forums:', sources.otherForums.join(', '));

    } catch (error) {
        console.error('Error during test:', error);
    }
}

main();
