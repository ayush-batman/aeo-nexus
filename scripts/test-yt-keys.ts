const keys = [
    'AIzaSyBBAuLfUb4deLtTwV68f-QkoA5MVAdXdKw',
    'AIzaSyD64a-Hiypu5ZV6IwmSArech5RmVq-kUgM'
];

async function test() {
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
