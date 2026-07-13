import OpenAI, { AzureOpenAI } from 'openai';

/**
 * Get an OpenAI-compatible client. Prefers Azure OpenAI when configured
 * (uses Founders Hub credits), falls back to direct OpenAI.
 *
 * @param variant  'default' → gpt-5-mini equivalent on Azure, gpt-4o-mini
 *                              on direct OpenAI (cheap, scan-appropriate).
 *                 'premium' → gpt-5 on Azure, gpt-4o on direct
 *                              (reasoning-heavy work).
 *                 'embedding' → text-embedding-3-small on Azure/direct.
 *
 * @returns { client, model } — the chat/completions model name to pass
 *          when calling client.chat.completions.create({ model, ... }).
 *          For Azure, `model` is the DEPLOYMENT NAME (not the underlying
 *          model name). The Azure SDK routes deployments transparently.
 */
export function getOpenAIClient(variant: 'default' | 'premium' | 'embedding' = 'default'):
    { client: OpenAI | AzureOpenAI; model: string } {

    // ─── Azure OpenAI (Founders Hub Foundry endpoint) ─────────────────
    const azureKey      = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureVersion  = process.env.AZURE_OPENAI_API_VERSION ?? '2025-01-01-preview';

    if (azureKey && azureEndpoint) {
        const deployment = variant === 'premium'
            ? (process.env.AZURE_OPENAI_DEPLOYMENT_PREMIUM ?? 'gpt-5')
            : variant === 'embedding'
                ? (process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING ?? 'text-embedding-3-small')
                : (process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? 'gpt-5-mini');

        const client = new AzureOpenAI({
            apiKey:     azureKey,
            endpoint:   azureEndpoint,
            apiVersion: azureVersion,
            deployment,
        });
        return { client, model: deployment };
    }

    // ─── Direct OpenAI (fallback if Azure isn't configured) ──────────
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        throw new Error(
            'No OpenAI provider configured. Set AZURE_OPENAI_API_KEY + ' +
            'AZURE_OPENAI_ENDPOINT (preferred) or OPENAI_API_KEY (fallback).'
        );
    }

    const model = variant === 'premium'
        ? 'gpt-4o'
        : variant === 'embedding'
            ? 'text-embedding-3-small'
            : 'gpt-4o-mini';

    return { client: new OpenAI({ apiKey: openaiKey }), model };
}

/**
 * Are we set up to do OpenAI-compatible scans at all?
 * Returns true if either Azure OpenAI OR direct OpenAI is configured.
 */
export function isOpenAIProviderAvailable(): boolean {
    return !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT)
        || !!process.env.OPENAI_API_KEY;
}

/**
 * Which provider is Aelo currently using? Useful for UI badges + debug.
 */
export function openAIProviderName(): 'azure' | 'openai' | 'none' {
    if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) return 'azure';
    if (process.env.OPENAI_API_KEY) return 'openai';
    return 'none';
}
