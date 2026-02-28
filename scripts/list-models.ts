import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
        console.log("Available Gemini Models (subset):");
        data.models.filter((m: any) => m.name.includes("gemini")).forEach((m: any) => {
            console.log(`- ${m.name} (version: ${m.version})`);
        });
    } else {
        console.log("Error fetching models:", data);
    }
}
main();
