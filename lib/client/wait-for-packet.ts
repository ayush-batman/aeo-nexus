import type { DecisionPacket } from '../measurement/decision-packet';
export async function waitForPacket(statusUrl: string): Promise<DecisionPacket> {
  if (!/^\/api\/onboarding\/decision-packet\?id=[0-9a-f-]{36}$/i.test(statusUrl)) throw new Error('Invalid packet URL');
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await fetch(statusUrl, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not check the measurement. Reload to reconnect.');
    if (!result.pending && result.packet) return result.packet;
    if (!result.pending) throw new Error('Saved packet was not found.');
  }
  throw new Error('The measurement is still running. Reload onboarding to reconnect without starting another scan.');
}
