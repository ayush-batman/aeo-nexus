import { readFileSync } from 'fs';
// Minimal .env.local loader (no deps). Values never printed.
export function loadEnv(path = '.env.local') {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}
