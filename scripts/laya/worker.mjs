#!/usr/bin/env node
// Local Laya worker: pulls unannotated scans from Convex, runs a local classifier command, posts results back.
// Env: AELO_SITE_URL (Convex HTTP site, https://<deployment>.convex.site), LAYA_WORKER_SECRET,
//      LAYA_CLASSIFY_CMD (reads {"prompt","response","brandVariants"} JSON on stdin, prints {"sentiment","confidence","labels"} JSON),
//      LAYA_CLASSIFIER_VERSION (default laya-v1). Usage: node scripts/laya/worker.mjs [--once]
import { spawnSync } from 'node:child_process';

const { AELO_SITE_URL: base, LAYA_WORKER_SECRET: secret, LAYA_CLASSIFY_CMD: cmd } = process.env;
const version = process.env.LAYA_CLASSIFIER_VERSION || 'laya-v1';
if (!base || !secret || !cmd) { console.error('Set AELO_SITE_URL, LAYA_WORKER_SECRET and LAYA_CLASSIFY_CMD'); process.exit(2); }
const headers = { authorization: `Bearer ${secret}`, 'content-type': 'application/json' };

async function call(path, init) {
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${path} ${res.status} ${await res.text()}`);
  return res.json();
}
function classify(item) {
  const r = spawnSync('sh', ['-c', cmd], { input: JSON.stringify(item), encoding: 'utf8', maxBuffer: 10_000_000 });
  if (r.status !== 0) throw new Error(`classifier failed: ${r.stderr.slice(0, 200)}`);
  return JSON.parse(r.stdout);
}

let after = 0, done = 0, failed = 0;
for (;;) {
  const page = await call(`/laya/pending?classifierVersion=${encodeURIComponent(version)}&after=${after}&limit=50`);
  for (const item of page.items) {
    try {
      const { sentiment = null, confidence, labels = {} } = classify(item);
      await call('/laya/annotations', { method: 'POST', body: JSON.stringify({ scanId: item.scanId, classifierVersion: version, sentiment, confidence, labels }) });
      done++;
    } catch (e) { failed++; console.error(item.scanId, e.message); }
  }
  if (page.next == null) break;
  after = page.next;
}
console.log(JSON.stringify({ version, annotated: done, failed }));
