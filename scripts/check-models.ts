
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

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

async function listModels() {
    console.log('🔍 Checking available Gemini Models...');
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ No API Key found');
        return;
    }

    // Note: The SDK might not expose listModels easily on the client instance in some versions,
    // but we can try to infer or just test a few common ones.
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];

    console.log('Testing connection to common models:');

    for (const modelName of modelsToTest) {
        try {
            process.stdout.write(`Testing ${modelName}... `);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            console.log(`✅ Success!`);
        } catch (error: any) {
            if (error.message && error.message.includes('404')) {
                console.log(`❌ Not Found (404)`);
            } else {
                console.log(`❌ Error: ${error.message?.substring(0, 50)}...`);
            }
        }
    }
}

listModels();
