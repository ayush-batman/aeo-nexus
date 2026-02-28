import { enrichBrandFromUrl } from '../lib/services/brand-enrichment';

async function main() {
    const url = 'https://stripe.com';
    console.log(`Testing enrichment for: ${url}`);

    try {
        const result = await enrichBrandFromUrl(url);
        console.log('Enrichment Result:', JSON.stringify(result, null, 2));

        if (result.name && result.industry) {
            console.log('✅ Success: Brand enrichment returned valid data.');
        } else {
            console.error('❌ Failure: Brand enrichment returned incomplete data.');
        }
    } catch (error) {
        console.error('❌ Error during enrichment:', error);
    }
}

main();
