import { loadEnv } from './env.mjs';
import { appendFileSync, writeFileSync } from 'fs';

const env = loadEnv();
const GKEY = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const AZ_URL = `${env.AZURE_OPENAI_ENDPOINT.replace(/\/$/,'')}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${env.AZURE_OPENAI_API_VERSION}`;

const CATEGORIES = ['skincare', 'coffee', 'protein bars', 'wireless earbuds', "men's fashion"];
const RUNS = 10;
const OUT = 'experiments/volatility/raw-responses.jsonl';
const LOG = 'experiments/volatility/run.log';
writeFileSync(OUT, '');
writeFileSync(LOG, '');
const log = (m) => { const s = `[${new Date().toISOString()}] ${m}`; console.log(s); appendFileSync(LOG, s + '\n'); };

const promptFor = (cat) =>
  `What are the best ${cat} brands in India right now? Give me a numbered ranked list of your top 5, brand names only, best first.`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GKEY}`;
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{ maxOutputTokens: 700, thinkingConfig:{ thinkingBudget: 0 } } }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0,200)}`);
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text.trim()) throw new Error('empty response');
  return { text, modelVersion: j?.modelVersion || GEMINI_MODEL };
}

async function callAzure(prompt) {
  const r = await fetch(AZ_URL, { method:'POST', headers:{'Content-Type':'application/json','api-key':env.AZURE_OPENAI_API_KEY},
    body: JSON.stringify({ messages:[{role:'user',content:prompt}], max_completion_tokens: 3000 }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0,200)}`);
  const text = j?.choices?.[0]?.message?.content ?? '';
  if (!text.trim()) throw new Error('empty response');
  return { text, modelVersion: j?.model || 'azure-openai' };
}

const ENGINES = [
  { id: 'gemini', label: 'Gemini', call: callGemini },
  { id: 'chatgpt', label: 'ChatGPT', call: callAzure },
];

let done = 0, failed = 0;
const total = CATEGORIES.length * ENGINES.length * RUNS;
log(`Starting volatility experiment: ${CATEGORIES.length} categories x ${ENGINES.length} engines x ${RUNS} runs = ${total} calls`);

for (const category of CATEGORIES) {
  const prompt = promptFor(category);
  for (const engine of ENGINES) {
    for (let run = 1; run <= RUNS; run++) {
      const timestamp = new Date().toISOString();
      let rec = { category, engine: engine.id, run, prompt, timestamp };
      let attempt = 0, ok = false;
      while (attempt < 2 && !ok) {
        attempt++;
        try {
          const { text, modelVersion } = await engine.call(prompt);
          rec = { ...rec, ok: true, modelVersion, raw: text };
          ok = true;
        } catch (e) {
          rec = { ...rec, ok: false, error: String(e.message || e) };
          if (attempt < 2) await sleep(2500);
        }
      }
      appendFileSync(OUT, JSON.stringify(rec) + '\n');
      if (rec.ok) { done++; } else { failed++; log(`  FAIL ${category}/${engine.id} run ${run}: ${rec.error}`); }
      if ((done + failed) % 10 === 0) log(`progress ${done + failed}/${total} (ok=${done} fail=${failed})`);
      await sleep(1300);
    }
    log(`done ${category} / ${engine.label}`);
  }
}
log(`COMPLETE: ${done} ok, ${failed} failed, of ${total}`);
