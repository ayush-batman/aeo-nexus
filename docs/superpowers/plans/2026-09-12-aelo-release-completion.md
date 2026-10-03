# Aelo Release Completion Implementation Plan

> **For agentic workers:** Execute inline in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Aelo's coherent public/product interface, add repeatable browser verification, and leave one fully checked release candidate whose only remaining gates require external credentials or explicit production approval.

**Architecture:** Shared marketing primitives will carry one evidence-instrument system across public pages. Existing Convex data and authorization paths remain unchanged; product work is limited to presentation, copy, states, and browser coverage. The evidence sequence is the only persistent motion signature.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Convex, Playwright library, Node test runner.

**Spec:** `.interface-design/system.md`, `docs/product-rescue/REMAINING_WORK_CHECKLIST.md`, and `AGENTS.md`.

## Global Constraints

- Preserve real multi-sample measurements, sample counts, confidence intervals, structured citation provenance, failures, and persistence status.
- Preserve `/api/v1`, MCP scopes and 401/403/429 behavior, Stripe, Razorpay, and Convex tenant checks.
- Use the existing graphite/ivory/reference-blue system; no gradients, glass, decorative status colors, ambient video, or WebGL.
- Every interactive target is at least 44px on mobile; keyboard focus and reduced motion remain first-class.
- Do not deploy, import production data, or use production credentials without explicit approval and an exact target.

---

### Task 1: Shared public-page system

**Files:**
- Create: `components/marketing/page-primitives.tsx`
- Modify: `app/globals.css`
- Test: `tests/integration/measurement-truth-contract.test.ts`

**Interfaces:**
- Produces: `MarketingHero`, `MarketingSectionHeading`, `MarketingCTA`, and evidence-led row/card patterns.
- Consumes: existing marketing layout, tokens, `Link`, and semantic HTML.

- [ ] Add a failing source contract that requires shared public-page primitives, 44px actions, no decorative gradient classes, and an honest evidence label.
- [ ] Run `npm run test:integration -- --test-name-pattern="public-page system"` and confirm failure.
- [ ] Implement server-rendered primitives with graphite `#131717`, mineral `#e9ece7`, paper `#fbfaf5`, structure `#bbc4bc`, and reference blue `#416a88`/`#a8cbe0`.
- [ ] Run the focused test and `npx eslint components/marketing/page-primitives.tsx`.

### Task 2: Product, pricing, methodology, about, and persona pages

**Files:**
- Modify: `app/(marketing)/product/page.tsx`
- Modify: `app/(marketing)/pricing/page.tsx`
- Modify: `app/(marketing)/methodology/page.tsx`
- Modify: `app/(marketing)/about/page.tsx`
- Modify: `components/marketing/solution-page.tsx`
- Review: `app/(marketing)/solutions/{founders,marketing,agencies,india}/page.tsx`
- Test: `tests/integration/measurement-truth-contract.test.ts`

**Interfaces:**
- Consumes: Task 1 primitives and current plan/measurement constants.
- Produces: consistent public pages with page-specific arguments and the same motion/evidence rules.

- [ ] Add a failing source contract that rejects the previous violet/teal/coral/yellow public palette and false certainty such as guaranteed mentions or causal lift.
- [ ] Rewrite Product as the five-stage evidence path: question → samples → receipt → investigation → compatible follow-up.
- [ ] Rewrite Pricing as a calm comparison table; keep configured prices and capabilities unchanged, state provider availability honestly, and avoid implying live integrations are verified.
- [ ] Restyle Methodology without changing formulas, version constants, Wilson thresholds, comparison keys, or citation rules.
- [ ] Rewrite About around the reason for the trust boundary; remove unsupported market statistics and causal claims.
- [ ] Restyle the shared Solution page and soften persona copy that claims unknown buyer behavior, guaranteed movement, simulations, or fixed prompt limits.
- [ ] Run the focused contract, lint the changed files, and take desktop/mobile screenshots of all five page shapes.

### Task 3: Onboarding as the first measurement story

**Files:**
- Modify: `app/(dashboard)/onboarding/page.tsx`
- Test: `tests/integration/dashboard-ui-contract.test.ts`

**Interfaces:**
- Preserves: existing brand enrichment, prompt generation, packet polling, and completion handlers.
- Produces: one evidence-led five-step flow with explicit scan duration, editable 3–5 prompts, partial/all-failed packet states, and one ranked investigation.

- [ ] Add a failing source contract for the five steps, 3–5 editable prompts, partial/all-failed language, and primary-job completion copy.
- [ ] Replace round progress dots and identical feature cards with a compact numbered progress rail and one paper work surface.
- [ ] Rewrite welcome/completion copy to name the actual result rather than generic tracker/forum/content features.
- [ ] Preserve loading, skip, retry, unavailable packet, and completion behavior.
- [ ] Run the focused contract, lint, type-check, and synthetic browser smoke at 1440×1000 and 390×844.

### Task 4: Primary dashboard consistency audit

**Files:**
- Modify as required: `app/(dashboard)/dashboard/llm-tracker/page.tsx`
- Modify as required: `components/dashboard/analytics/citation-map.tsx`
- Modify as required: `app/(dashboard)/dashboard/interventions/page.tsx`
- Modify as required: `app/(dashboard)/dashboard/report/report-view.tsx`
- Modify as required: `app/(dashboard)/dashboard/settings/page.tsx`
- Test: `tests/integration/dashboard-ui-contract.test.ts`

**Interfaces:**
- Preserves: queries, mutations, auth/role checks, billing, API keys, and measurement data.
- Produces: consistent focal hierarchy, states, control sizing, restrained status color, and evidence-first copy in all five jobs.

- [ ] Add a failing source contract for each job's focal element plus loading, empty, partial, error, and retry states.
- [ ] Remove remaining direct blue/orange/amber utility colors where color does not encode status.
- [ ] Replace generic card headings and title-case controls with plain, stable action language.
- [ ] Verify confidence/sample count remains adjacent to every score and failed engines never display zero.
- [ ] Run focused tests, lint, both type-checks, and authenticated synthetic browser smoke.

### Task 5: Repeatable end-to-end command

**Files:**
- Create: `scripts/e2e/core-journey.mjs`
- Modify: `package.json`
- Modify: `tests/integration/browser-journey-contract.test.ts`

**Interfaces:**
- Produces: `npm run test:e2e`, always covering public pages and optionally covering the authenticated synthetic journey when `AELO_TEST_EMAIL` and `AELO_TEST_PASSWORD` are supplied.

- [ ] Add a failing contract requiring the `test:e2e` script, public routes, mobile/desktop widths, console/page/request failure capture, interaction checks, reduced-motion checks, and authenticated-route support.
- [ ] Implement the browser script with Playwright's installed Chrome channel, bounded waits, screenshots on failure, and no production credentials.
- [ ] Run `npm run test:e2e` against `http://localhost:3000` and fix all public failures.
- [ ] Run the existing authenticated synthetic smoke when credentials are available; otherwise record that exact external gate.

### Task 6: Final release-candidate review

**Files:**
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`
- Modify: `docs/product-rescue/REMAINING_WORK_CHECKLIST.md`

**Interfaces:**
- Produces: an evidence-backed handoff with only external gates left.

- [ ] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run typecheck:mcp`, `npm run build -- --webpack`, `npm audit --omit=dev --audit-level=low`, and `git diff --check`.
- [ ] Run the end-to-end command and review browser console, failed same-origin requests, overflow, keyboard focus, reduced motion, and mobile/desktop screenshots.
- [ ] Review the complete diff for auth, tenant boundaries, data loss, measurement truth, performance, accessibility, and unrelated scope.
- [ ] Update both rescue documents with exact pass/fail evidence; leave provider credentials, production import, and production deployment unchecked.
