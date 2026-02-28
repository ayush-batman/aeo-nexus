async function test() {
    const response = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q=dashcam&type=video&key=' + process.env.YOUTUBE_API_KEY);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}
test();
