import { scanLLM } from '../lib/ai/llm-scanner';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
    console.log("Running direct LLM Scan...");
    const result = await scanLLM({
        prompt: "Compare the following two brands for dashcam in india: 1. dylect 2. qubo",
        brandName: "dylect",
        competitors: ["qubo"],
        mode: "battle",
        platforms: ['gemini', 'chatgpt', 'claude']
    });
    
    console.log("\n--- ERRORS ---");
    console.log(JSON.stringify(result.errors, null, 2));
    
    console.log("\n--- RESULTS ---");
    console.log(`Successfully completed ${result.results.length} platforms.`);
}

main().catch(console.error);
