
import fs from 'fs';
import path from 'path';

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    });
} catch (e) { }

async function checkModels() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ No GOOGLE_API_KEY found in .env.local');
        return;
    }

    console.log(`Checking models for API Key: ${apiKey.substring(0, 5)}...`);

    // Direct REST call to list models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('❌ API Error:', JSON.stringify(data.error, null, 2));
            return;
        }

        if (!data.models) {
            console.log('⚠️ No models returned. Response:', data);
            return;
        }

        console.log('\n✅ Available Models:');
        data.models.forEach((m: any) => {
            if (m.supportedGenerationMethods?.includes('generateContent')) {
                console.log(`- ${m.name.replace('models/', '')}`);
            }
        });

    } catch (error) {
        console.error('❌ Network/Parse Error:', error);
    }
}

checkModels();
