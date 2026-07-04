# Aelo (AEO SaaS) — Audit & Implementation Plan

_Generated: 2026-07-03. Based on code review + live testing of core engines via `scripts/audit-harness.ts`._

## 1. What the project is
Next.js 16 (App Router) + Supabase multi-tenant SaaS for "Answer Engine Optimization". Org → Workspace hierarchy, RLS, and an AI layer (Gemini/OpenAI/Anthropic/Perplexity) that scans how LLMs talk about a brand, plus forum discovery (Reddit/YouTube/StackExchange/HN/Google CSE), content auditing, prompt/question mining, alerts, analytics, and Razorpay/Stripe billing.

**Feature surface (routes exist):** Dashboard, LLM Tracker, Battle Arena, Content Studio, Forum Hub, LLMs.txt Studio, Analytics, Agent Auditor, Playbook, Settings (all in sidebar) + Attribution, Experiments, Products, Prompts, Question-Mine (built but **not linked in nav** — orphaned).

## 2. How it was tested
- **Live engine tests** (`scripts/audit-harness.ts`, run via `tsx`): calls the real scanner, analyzer, enrichment, content audit, prompt gen, source discovery, all 5 forum integrations, and Supabase — against real APIs/keys in `.env.local`.
- **Static audit**: read all API routes, `lib/`, middleware, data-access, and representative pages.
- **UI could NOT be exercised**: the Next 16 dev server does not serve a single request in this environment (see 3.1). Findings on UI are from code, not runtime.

## 3. What is NOT working

### 3.1 BLOCKER — Dev server / build won't serve requests (this environment)
- `next dev` (Turbopack): boots ("Ready") then **crashes on first request** with `ENOENT ... .next/dev/prerender-manifest.json` / `_buildManifest.js.tmp`.
- `next dev --webpack`: compiles but then **hangs at 0% CPU on every request** — even `/favicon.ico` and `/robots.txt` return HTTP 000. So it is not a page/middleware bug; the request pipeline never responds.
- `next build`: hangs indefinitely at "Creating an optimized production build …".
- Next 16 also warns `middleware` file convention is **deprecated → rename to `proxy`**.
- **Likely a Next 16.2.9 + sandbox filesystem issue** (manifest temp-file writes). May behave differently on the user's own machine, but the bleeding-edge Next 16 pin + deprecated middleware are real risks. **Until this is resolved, the app cannot be used or QA'd via the browser.**

### 3.2 CRITICAL — Every LLM provider is dead; scanner silently returns MOCK data
Live results (`scanLLM` for each platform all returned `platform: "mock"`):
| Provider | Status |
|---|---|
| Gemini (PRIMARY analyzer + scanner) | **403 – "API key was reported as leaked. Please use another API key."** |
| OpenAI (ChatGPT) | **429 – "account is not active, check billing"** |
| Anthropic (Claude) | **"credit balance too low"** |
| Perplexity | **key missing/empty** (`PERPLEXITY_API_KEY` not loaded) |

Because `scanLLM` catches all errors and **injects mock data with empty `errors[]`** (`lib/ai/llm-scanner.ts:344`), and `llm/scan` route **relabels `mock` → `gemini`** before saving (`app/api/llm/scan/route.ts:75`), the UI shows fabricated results as if they were real Gemini scans. There are already **15 rows in `llm_scans`** that are almost certainly mock. This corrupts every downstream metric (Health Score, Visibility, Share of Voice, Battle winner, alerts).
→ **Gemini is the linchpin.** With it dead, prompt generation, brand enrichment (partial), originality scoring, source discovery, question mining, content writer, and the analyzer all degrade to fallback/empty or hard-fail.

### 3.3 Confirmed functional-but-degraded / broken engines (live)
- `scoreOriginality` — **hard FAIL** (Gemini 403; no fallback because a key *is* present but invalid).
- `generatePrompts` — returns the **5-item hardcoded fallback**, not real 30-prompt generation (Gemini 403 → catch block).
- `enrichBrandFromUrl` — **partial**: scrapes title/description OK, but `industry="Other"`, `targetAudience="General"`, `competitors=[]` are defaults (Gemini step failed).
- `discoverIndustrySources` — returns generic/fallback lists (Gemini path unavailable).
- **Google CSE** — configured but returns **0 results** (query returned empty; CSE ID or Custom Search API on the leaked key likely misconfigured/disabled).
- **Reddit** — returns **0 results** and no OAuth creds (`REDDIT_CLIENT_ID/SECRET` absent); public JSON path is being blocked/empty. Reddit is described as a *core* source in the concept note.

### 3.4 Working engines (live, verified)
- `auditContent` (Content/Technical Auditor) — ✅ full cheerio-based analysis (H1s, alt text, schema, Q&A, word count, score).
- StackExchange, Hacker News, YouTube search — ✅ real results.
- Supabase admin connectivity — ✅ (`llm_scans` reachable, count=15).

### 3.5 Confirmed code bugs (from review)
1. **Dashboard Health Score always 0** — API returns `aeoHealthScore`/`aeoScoreChange` (`lib/data-access.ts:522`), UI reads `stats.aeloHealthScore`/`aeloScoreChange` (`app/(dashboard)/dashboard/page.tsx:307,312`). Key mismatch (`aeo` vs `aelo`) → score + change badge never render.
2. **"New Citation" alert can never fire** — `lib/alerts/evaluate.ts:160` filters `c.is_own_domain` (snake_case) but citations are stored as `{ isOwnDomain }` (camelCase from `llm-scanner.ts`).
3. **Cron saves `platform: "mock"`** — `app/api/cron/process-scans/route.ts:147` inserts `res.platform` directly (no mock→gemini remap like the manual route), which will violate the `llm_scans` platform CHECK constraint when providers fail.
4. **Dev Auth Bypass is half-wired** — `middleware.ts` honors a `dev-auth-bypass` cookie, but `getCurrentWorkspaceContext` has the bypass **commented out** (`lib/data-access.ts:46-62`), so every authenticated API returns 401/null. The "Dev Login" QA path in `feature_plan.md` does not actually work.
5. **Orphaned pages** — `attribution`, `experiments`, `products`, `prompts`, `question-mine` are built with APIs but not reachable from the sidebar.

### 3.6 Config / secrets hygiene
- Real API keys are committed in `.env.local` (and `.env.vercel*`), and the **DB password is in plaintext in a comment in `.env.local`**. The Gemini key is already flagged as leaked — consistent with keys being exposed. All keys should be rotated.

## 4. Implementation plan (prioritized)

### P0 — Make it runnable & real (unblocks everything)
1. **Fix the runtime.** Try, in order: (a) pin to a stable Next (`15.x`) or a known-good `16.x` patch; (b) rename `middleware.ts` → `proxy.ts` per Next 16; (c) delete `.next`, `node_modules/.cache`; (d) if sandbox-only, document the working command for the user's machine. Success = `/` returns 200 and `/dashboard` loads.
2. **Rotate ALL API keys** (Gemini leaked, OpenAI billing, Anthropic credits, add Perplexity) and move secrets out of the repo; scrub the DB password from `.env.local`. Add a startup **key-health check** endpoint that pings each provider and surfaces status in the UI/settings.
3. **Stop silently faking data.** Gate the mock fallback behind `ALLOW_MOCK_LLM` (default off in prod); when a provider fails, return the real `errors[]` to the UI and do **not** relabel `mock`→`gemini`. Purge existing mock rows from `llm_scans`.

### P1 — Fix confirmed bugs
4. Fix `aeoHealthScore` vs `aeloHealthScore` key mismatch (standardize on one; update UI + `DashboardStats`).
5. Fix citation `isOwnDomain` casing in the alert engine (and align the `ScanData` type).
6. Remap `mock`→`gemini` (or add `mock` to the allowed platforms) in the cron route to match the manual scan route.
7. Wire the dev-auth bypass end-to-end (uncomment + implement a real test-user context in `getCurrentWorkspaceContext`) **or** remove the half-feature and document `GET /api/setup-test-user` as the QA path.

### P2 — Restore degraded features
8. **Reddit**: add `REDDIT_CLIENT_ID/SECRET/USER_AGENT`, verify OAuth path; add a graceful "source unavailable" UI state.
9. **Google CSE**: verify the CSE ID + enable Custom Search API on the (rotated) key; assert non-zero results in a smoke test.
10. Re-verify `generatePrompts`, `scoreOriginality`, `discoverIndustrySources`, `enrichBrandFromUrl` end-to-end once Gemini is live (they are correct code, just starved of a working key).

### P3 — Product completeness & polish
11. Decide on orphaned pages (attribution/experiments/products/prompts/question-mine): link them in the sidebar or remove.
12. Add integration smoke tests (extend `scripts/audit-harness.ts`) to CI so provider/billing outages are caught early.
13. Billing (Razorpay/Stripe) and alerts/notifications: exercise end-to-end once the server runs (not yet verified at runtime).

## 5. Suggested first PR
P0.3 + P1 bug fixes (items 3–6) are small, self-contained, and stop the app from lying about data. Do them alongside the runtime fix (P0.1) and key rotation (P0.2).
