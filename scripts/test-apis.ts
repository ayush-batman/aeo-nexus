import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
    console.log("Mocking API Request with Local DB...");

    // We can't easily mock NextRequest without next-js internals, 
    // so we'll directly test the source discovery engines
    import('../lib/integrations/google-search-client').then(async (m) => {
        const res = await m.searchForums("dashcam", { limit: 5 });
        console.log("GOOGLE SEARCH:", JSON.stringify(res, null, 2));
    });

    import('../lib/integrations/youtube-client').then(async (m) => {
        const res = await m.searchYouTube("dashcam", { maxResults: 5 });
        console.log("YOUTUBE SEARCH:", JSON.stringify(res, null, 2));
    });

}

main().catch(console.error);
