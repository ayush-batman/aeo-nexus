import { loadEnvConfig } from '@next/env';
import { POST } from '../app/api/forum/discover/route';
import { NextRequest } from 'next/server';

loadEnvConfig(process.cwd());

async function main() {
    console.log("Mocking API Request...");
    
    // Create a mock NextRequest
    const req = new NextRequest('http://localhost:3000/api/forum/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: "dashcam",
            limit: 10
        })
    });

    const res = await POST(req);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
