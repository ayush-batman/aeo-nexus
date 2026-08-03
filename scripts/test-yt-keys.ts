// Reads keys from the environment. NEVER hardcode API keys here, this repo is
// public and Google auto-revokes any key it finds committed to GitHub.
// Usage: YT_TEST_KEYS="key1,key2" npx tsx scripts/test-yt-keys.ts
const keys = (process.env.YT_TEST_KEYS || process.env.YOUTUBE_API_KEY || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

async function test() {
    if (keys.length === 0) {
        console.log('No keys provided. Set YT_TEST_KEYS="key1,key2" in the environment.');
        return;
    }
    for (const key of keys) {
        console.log(`Testing key: ${key.substring(0, 10)}...`);
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=dashcam&type=video&key=${key}`);
        if (res.ok) {
            console.log(" SUCCESS!");
        } else {
            const data = await res.json();
            console.log(" FAILED: " + data.error.message);
        }
    }
}
test();
