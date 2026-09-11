export async function waitForAnalysis(statusUrl: string) {
  if (!/^\/api\/analysis\/[a-zA-Z0-9-]+$/.test(statusUrl)) throw new Error('Invalid analysis status URL');
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await fetch(statusUrl, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not check analysis status. Reload to retry.');
    if (result.status === 'all_failed') throw new Error('Analysis failed. Previous evidence was preserved; check provider configuration and retry.');
    if (result.status !== 'running') return result as { processed: number; claims: number; attributes: number; failed: number; status: string };
  }
  throw new Error('Analysis is still running in the background. Reload this page later to check.');
}
