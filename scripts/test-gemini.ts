
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

async function testGemini() {
    try {
        // Read .env.local manually
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/GOOGLE_API_KEY=(.+)/);

        if (!match) {
            console.error('GOOGLE_API_KEY not found in .env.local');
            return;
        }

        const apiKey = match[1].trim();
        console.log('Testing with API Key length:', apiKey.length);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('Sending prompt to Gemini...');
        const result = await model.generateContent('Hello, are you working?');
        const response = result.response;
        const text = response.text();

        console.log('Success! Response:', text);
    } catch (error) {
        console.error('Gemini Test Failed:', error);
    }
}

testGemini();
