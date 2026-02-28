import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDiscover() {
    try {
        console.log("Hitting API...");
        const response = await fetch('http://localhost:3000/api/forum/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'dashcam',
                subreddits: ['cars', 'dashcam'],
                limit: 5
            })
        });

        const data = await response.json();
        console.log(`Discovered: ${data.discovered}`);
        console.log(`Saved: ${data.saved}`);
        console.log("Status:", data.sourceStatus);
    } catch (e) {
        console.error(e);
    }
}

testDiscover();
