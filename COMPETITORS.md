# Aelo — Competitive Landscape & Feature Parity Checklist
_Researched 2026-07-03. The category is called **AEO** (Answer Engine Optimization) or **GEO** (Generative Engine Optimization). Market is ~2 years old and consolidating fast._

---

## The one insight that matters
The market has split into two tiers:

- **Trackers (the mirror):** "here's your visibility in ChatGPT." Commoditized. Otterly, Peec, most tools. Race to the bottom on price.
- **Action platforms (the lever):** "here's what to do, and did it work." Where the money and moats are. **Profound** (Workflows + AI-crawler Agent Analytics), **Scrunch** (content delivery to LLMs / AXP), **AthenaHQ** ("Agents to Win," agentic copilot).

Aelo is currently a broken tracker. The whole plan is to skip the commoditized middle and be a **lever built for one niche (India-first SMB/SaaS/D2C)** — because that's the one segment the well-funded US/EU leaders ignore.

---

## A. Global competitors (the full list)

### Tier 1 — Enterprise leaders (well-funded, Fortune 500)
| Tool | Notes |
|---|---|
| **Profound** | Category king. $155M raised, ~$1B valuation. 200k prompts/day/customer, Workflows (automated content ops), **Agent Analytics** (CDN-level AI-crawler tracking via Akamai/AWS/Cloudflare/Fastly), Shopping Analysis, 30+ languages, HIPAA. |
| **Scrunch AI** | "Most complete." Multi-LLM monitor + audit + optimize + **deliver optimized content to LLMs (AXP)** + real-time AI-crawler feed + Site Maps. |
| **AthenaHQ** | "Agents to win on AI search." **Ask Athena** agentic copilot ("why is my competitor ranking above me?"), content briefs/outlines/full articles. |
| **Bluefish** | Enterprise, well-funded. |
| **Evertune** | Enterprise brand-perception in AI. |
| **Adobe LLM Optimizer** | Only tool besides Scrunch meeting all 5 criteria (monitor/audit/optimize/deliver/enterprise). |
| **Semrush AI Visibility Toolkit** | SEO incumbent bolt-on. ~$120–450/mo. |
| **Ahrefs Brand Radar** | SEO incumbent bolt-on. |
| **Conductor** | Enterprise content + AEO. |

### Tier 2 — Mid-market analytics
| Tool | Notes |
|---|---|
| **Peec AI** | EU/Germany. $29M raised, $4M ARR in 10 months. From ~€85/mo. 8 models (adds Copilot, Grok, DeepSeek, Llama). Citation monitoring, SoV, regional prompts. |
| **Gauge** | 7+ LLM integrations. |
| **Writesonic** | From $199/mo, content-gen heavy. |
| **AirOps** | Content workflows + visibility. |

### Tier 3 — SMB / entry-level trackers
Otterly.ai ($29/mo, 6 engines — the price floor), Nightwatch, Rankshift, SolCrys, Sanbi, Xseek, Omnia, Mybrandi, Mersel, Surmado, Indexly, Rankability, Hall AI, Mint, Airefs, AI Rank Lab.

### Tier 4 — Adjacent: AI-crawler / bot-traffic specialists (a whole sub-category Aelo doesn't touch)
Finseo, Cito, Webalert, **Am I Cited**, Momentic — all track GPTBot/ClaudeBot/PerplexityBot hitting *your* site via server logs / CDN. Server logs reveal 30–40% of traffic is AI crawlers that GA hides.

### Vertical specialists
**GrackerAI** — B2B SaaS only (cybersecurity, fintech, dev tools), industry-tuned models.

---

## B. India competitors (separate category — this is our beachhead)

India is the **#1 country by active ChatGPT users**, with adoption deep into Tier-2 cities. Yet the category is nearly empty here — a rare open lane.

| Player | What they are | Pricing | Threat |
|---|---|---|---|
| **Listable Labs** | "India's first dedicated GEO platform." The one to beat. Tracks ChatGPT/Perplexity/Gemini, "Share of Model," Entity SEO + Knowledge Graph optimization, **25 AI-optimized articles/mo**, competitor + citation source analysis, multi-country, understands Indian queries ("best B2B SaaS in Pune", "smartphones under 20k"). | Growth $60, Scale $150, Max $400 (USD) + Enterprise | **HIGH** — direct, ahead, India-native. Beat them on the *loop + proof*, not on tracking. |
| **GrackerAI** | B2B SaaS vertical (may be US-registered, India-active). | — | Medium (vertical overlap) |
| **upGrowth / Brandlogg / SEORevive / ZeroADO** | Agencies/consultancies doing AEO as a *service*, not product. | Retainer | Low (services, not SaaS) — but they're your channel/design partners. |
| Otterly / Peec | Global tools used by Indian brands. | USD/EUR | Medium — but priced in $/€, no Razorpay, no Indian-query nuance. **This is our wedge.** |

**Takeaway:** Only Listable Labs is a real India-native product competitor. Everyone else is a global tool with no local pricing/context, or an agency. India-first is a genuinely defensible position for ~12–18 months.

---

## C. Feature parity checklist — is Aelo better?

Legend: ✅ have & competitive · 🟡 have but broken/weak · ❌ missing · ⭐ opportunity to be *best*

### Table stakes (must match to be credible)
| Capability | Best-in-class | Aelo today | Verdict |
|---|---|---|---|
| Multi-LLM monitoring | Peec: 8 models | 5 (GPT, Gemini, Claude, Perplexity, Google AIO) — **all returning mock data (dead keys)** | 🟡 must fix keys; add Copilot/Grok/DeepSeek later |
| Share of Voice / "Share of Model" | All | Built | 🟡 works once data is real |
| Sentiment analysis | All | Built (AI + keyword fallback) | ✅ |
| Citation / source tracking | Profound, Peec | Built (Citation Analytics + gaps) | ✅ genuine strength |
| Competitor benchmarking | All | Built (+ Battle Arena) | ✅ (fold Battle into main) |
| Prompt / topic discovery | All | Built (prompt gen + question mine) | ✅ |
| Scheduled / automated tracking | All | Built (Vercel cron) | 🟡 saves mock; needs fix |
| Sentiment/visibility alerts | Most | Built (+ email via Resend) | 🟡 1 alert type broken |
| Content / technical audit | Scrunch, Athena | Built & **verified working** | ✅ |
| AI content generation | Athena, Listable (25/mo) | Built (content writer, schema, clusters) | ✅ |
| Exportable / client reports | Listable, agencies | Partial (jsPDF present) | 🟡 |
| Local pricing + payments (India) | Listable (but $ pricing!) | **₹ tiers + Razorpay built** | ⭐ **better than everyone for India** |

### Differentiators (where Aelo can win)
| Capability | Who has it | Aelo | Verdict |
|---|---|---|---|
| **Forum intervention** — generate non-spammy replies to insert brand into the Reddit/forum threads LLMs cite | ~nobody (they track citations, don't help you act) | Built (Forum Hub) | ⭐ **near-unique** — the DIAGNOSE→PRESCRIBE bridge |
| **Closed loop + proof** (act → re-scan → before/after receipt) | Everyone claims "action," nobody proves outcome per-intervention | Pieces exist, not welded | ⭐ **biggest opportunity** |
| **India-native context** (₹, Razorpay, Indian-query nuance, local benchmark index) | Only Listable (partial) | Foundation built | ⭐ own the niche |

### Gaps vs leaders (the frontier — choose carefully, no bloat)
| Capability | Who has it | Aelo | Decision |
|---|---|---|---|
| **AI-crawler / Agent Analytics** (GPTBot/ClaudeBot/PerplexityBot hitting your site, via pixel or log/CDN) | Profound, Scrunch, Finseo, Cito, Am I Cited | ❌ (only referral-based "AI visits" seed) | **Phase 2** — ship a lightweight JS-pixel + optional log upload (skip enterprise CDN). High-signal, defensible. |
| **Content delivery to LLMs / llms.txt / AXP** | Scrunch, Adobe | 🟡 llms-txt page exists but frozen | **Phase 2** — unfreeze as part of the "Act" step |
| **Agentic copilot** ("ask why competitor wins") | AthenaHQ | ❌ | **Later** — nice, not core to SMB "best". Revisit post-PMF. |
| 8+ models incl. Copilot/Grok/DeepSeek | Peec | ❌ (5) | **Easy add** once keys are live |
| Multi-country / language | Profound (30+), Listable | Partial | Later |

---

## D. Verdict: what makes Aelo "class apart" (without bloat)

We do **not** win by having more tracking features than Profound — we can't out-fund them. We win by being the only tool that, **for Indian SMBs/SaaS/D2C**, closes the loop:

1. **Fix the core so numbers are real** (table stakes — currently the whole product is mock data).
2. **Weld the one thing nobody else does well:** SCAN → DIAGNOSE (citations) → **PRESCRIBE (forum reply + content, which we uniquely have)** → ACT → RE-SCAN → **PROVE (before/after receipt — which nobody does per-intervention)**.
3. **Own India:** ₹ pricing, Razorpay, Indian-query understanding, and a public monthly "India AI Visibility Index" for PR + inbound.
4. **One frontier bet in Phase 2:** lightweight AI-crawler analytics (pixel-based) so we also answer "are the AIs even reading my site?" — a question trackers can't answer and Indian SMBs will pay for.

Everything else (agency mode, agentic copilot, 8 models, CDN log integration) is **deferred, not built**, until 10 Indian brands pay and retain.
