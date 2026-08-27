import { readFileSync, writeFileSync } from 'fs';

const rows = readFileSync('experiments/volatility/raw-responses.jsonl','utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));

function parseRanked(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(\d+)[\.\)]\s+(.+?)\s*$/);
    if (!m) continue;
    let name = m[2].replace(/\*\*/g,'').replace(/[*_`]/g,'').replace(/^["'“]|["'”]$/g,'');
    name = name.split(/\s[\-–—:]\s|[:(–—]|,\s/)[0];
    name = name.replace(/\s+/g,' ').trim();
    if (name && name.length <= 45) out.push(name);
  }
  return out;
}

// tokens for variant detection (drop generic descriptor words)
const GENERIC = new Set(['coffee','roasters','roastery','max','protein','skin','science','lifestyle',
  'india','co','company','the','cosmetics','apparel','clothing','audio','nutrition','bar','bars','&','and']);
const toks = (s) => s.toLowerCase().replace(/[^a-z0-9 &]/g,' ').split(/\s+/).filter(Boolean);
const core = (s) => toks(s).filter(t => !GENERIC.has(t));

// two labels are the same brand if one's core tokens are a prefix of the other's
function sameBrand(a, b) {
  const ca = core(a), cb = core(b);
  if (!ca.length || !cb.length) return a.toLowerCase() === b.toLowerCase();
  const [s, l] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  return s.every((t, i) => l[i] === t);
}

// per set of labels, build canonical map (canonical = shortest label in cluster)
function canonMap(labels) {
  const uniq = [...new Set(labels)];
  const clusters = [];
  for (const lab of uniq) {
    let hit = clusters.find(c => c.some(x => sameBrand(x, lab)));
    if (hit) hit.push(lab); else clusters.push([lab]);
  }
  const map = {};
  for (const c of clusters) {
    const canon = c.slice().sort((a,b) => a.length - b.length)[0];
    for (const lab of c) map[lab] = canon;
  }
  return map;
}

const cells = {};
for (const r of rows) (cells[`${r.category}||${r.engine}`] ??= []).push(r);
const comb2 = (n) => n*(n-1)/2;

const summary = [];
for (const [k, recs] of Object.entries(cells)) {
  const [category, engine] = k.split('||');
  const parsed = recs.filter(r => r.ok).map(r => ({ ...r, brands: parseRanked(r.raw) })).filter(r => r.brands.length);
  const n = parsed.length;

  // canonicalize across every brand mentioned in this cell
  const allLabels = parsed.flatMap(r => r.brands);
  const cmap = canonMap(allLabels);
  const canon = (b) => cmap[b] || b;

  const firsts = parsed.map(r => canon(r.brands[0]));
  const firstCounts = {};
  for (const f of firsts) firstCounts[f] = (firstCounts[f]||0)+1;
  const distribution = Object.entries(firstCounts).sort((a,b)=>b[1]-a[1]);
  const uniqueFirsts = distribution.length;

  const top3 = new Set();
  for (const r of parsed) r.brands.slice(0,3).forEach(b => top3.add(canon(b)));

  const sameP = n>1 ? Object.values(firstCounts).reduce((s,c)=>s+comb2(c),0)/comb2(n) : 1;
  summary.push({ category, engine, n, failed: recs.length - n,
    uniqueFirsts, distinctTop3: top3.size, diffTopProb: 1 - sameP,
    distribution: distribution.map(([b,c]) => `${b} ${c}/${n}`) });
}

const withData = summary.filter(s => s.n > 1);
const headline = withData.reduce((s,c)=>s+c.diffTopProb,0)/withData.length;
const byEngine = {};
for (const eng of ['gemini','chatgpt']) {
  const cs = withData.filter(s=>s.engine===eng);
  byEngine[eng] = cs.reduce((s,c)=>s+c.diffTopProb,0)/(cs.length||1);
}
const byCat = {};
for (const s of withData) (byCat[s.category] ??= []).push(s.diffTopProb);
const catAvg = Object.entries(byCat).map(([c,a]) => [c, a.reduce((x,y)=>x+y,0)/a.length]).sort((a,b)=>b[1]-a[1]);

writeFileSync('experiments/volatility/results.json', JSON.stringify(
  { generatedAt:new Date().toISOString(), ok: rows.filter(r=>r.ok).length,
    headline_diffTopProb_all: headline, byEngine, mostVolatile: catAvg[0], mostStable: catAvg.at(-1), summary }, null, 2));

const pct = (x)=>`${Math.round(x*100)}%`;
console.log('\n## Summary table\n');
console.log('| Category | Engine | Runs | Unique #1 | Distinct top-3 | P(2 runs differ on #1) | #1 distribution |');
console.log('|---|---|---|---|---|---|---|');
for (const s of summary.sort((a,b)=> a.category.localeCompare(b.category) || a.engine.localeCompare(b.engine)))
  console.log(`| ${s.category} | ${s.engine} | ${s.n} | ${s.uniqueFirsts} | ${s.distinctTop3} | ${pct(s.diffTopProb)} | ${s.distribution.join(', ')} |`);
console.log(`\n**HEADLINE: across all ${withData.length} category×engine cells, the same question asked twice returned a DIFFERENT #1 brand ${pct(headline)} of the time.**`);
console.log(`- By engine — Gemini ${pct(byEngine.gemini)}, ChatGPT ${pct(byEngine.chatgpt)}`);
console.log(`- Most volatile category: ${catAvg[0][0]} (${pct(catAvg[0][1])}) · Most stable: ${catAvg.at(-1)[0]} (${pct(catAvg.at(-1)[1])})`);
