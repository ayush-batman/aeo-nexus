
import fs from 'fs';
import path from 'path';
import { scanLLM } from '../lib/ai/llm-scanner';

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');

    // Simple parsing for key=value
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
            process.env[key] = value;
        }
    });
} catch (error) {
    console.warn('⚠️ Could not load .env.local', error);
}

async function runDylectScan() {
    console.log('🚀 Launching Dylect AEO Bot...');
    console.log('-----------------------------------');

    const brandName = 'Dylect';
    const prompt = `What is ${brandName}? Tell me about this brand, its products, and reputation.`;

    console.log(`Scanning for brand: ${brandName}`);
    console.log(`Prompt: "${prompt}"`);

    // Check for API keys before starting
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️ ANTHROPIC_API_KEY is missing from environment variables!');
        console.log('Loaded keys:', Object.keys(process.env).filter(k => k.endsWith('_KEY')));
    }

    try {
        const { results, errors } = await scanLLM({
            brandName,
            prompt,
            platforms: ['claude'], // Switching to Claude (Anthropic) as Gemini is blocked
            mode: 'standard'
        });

        if (errors.length > 0) {
            console.warn('⚠️ Platform errors:', errors.map(e => `${e.platform}: ${e.error}`).join(', '));
        }

        if (results.length === 0) {
            console.log('❌ No results returned from scan. Check previous error logs.');
            return;
        }

        const result = results[0];

        console.log('\n✅ Scan Complete!');
        console.log('-----------------------------------');
        console.log(`Platform: ${result.platform}`);
        console.log(`Brand Mentioned: ${result.brandMentioned ? 'Yes' : 'No'}`);
        console.log(`Sentiment: ${result.sentiment}`);
        console.log(`Sentiment Score: ${result.sentimentScore}`);
        console.log('\n--- AI Response Snippet ---');
        console.log(result.response.substring(0, 500) + '...');
        console.log('\n-----------------------------------');

    } catch (error) {
        console.error('❌ Error running Dylect scan:', error);
    }
}

runDylectScan();
