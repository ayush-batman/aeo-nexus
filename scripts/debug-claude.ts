import fs from 'fs';
import path from 'path';

// Load .env.local manually (same as run-dylect-scan.ts)
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    });
    console.log('✅ Loaded .env.local');
} catch (e) {
    console.error('❌ Error loading .env.local:', e);
}

async function debugClaude() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('ANTHROPIC_API_KEY configured:', !!apiKey);
    if (apiKey) {
        console.log('Key length:', apiKey.length);
        console.log('Key prefix:', apiKey.substring(0, 10) + '...');
    } else {
        console.log('❌ No API key found. Exiting.');
        return;
    }

    console.log('\nTesting Claude API...');
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 256,
                messages: [{ role: 'user', content: 'Hello, are you working? Reply briefly.' }],
            }),
        });

        console.log('Response status:', response.status, response.statusText);

        if (!response.ok) {
            const text = await response.text();
            console.error('❌ API Error Body:', text);
        } else {
            const data = await response.json();
            console.log('✅ Success!');
            console.log('Response:', data.content[0].text);
        }
    } catch (error) {
        console.error('❌ Network/Other Error:', error);
    }
}

debugClaude();
