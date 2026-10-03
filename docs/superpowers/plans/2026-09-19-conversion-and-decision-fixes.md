# Conversion and Decision Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore dependable signup, make every plan promise consistent, and show prospective and signed-in users the decision value that follows from Aelo's evidence.

**Architecture:** Keep authentication in the existing Better Auth + Convex integration and enable Google only when both server credentials exist. Define one public plan catalogue that maps customer-facing names to stored billing plan keys, then consume it across pricing, signup, receipts, and dashboard settings. Extend the existing dashboard summary with a deterministic evidence-backed decision brief, and reuse the dashboard's visual language in the public scan receipt and methodology case study.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Better Auth, Convex, Tailwind CSS, Node test runner, Vitest.

**Spec:** User-approved ordered fixes from 2026-09-19 in this task.

## Global Constraints

- Signup is the first release gate; do not proceed on product work until its code and tests pass.
- A failed or missing provider result must never become generated or mock evidence.
- Plan names, prices, limits, engine access, and team size must come from one canonical catalogue.
- Explanations must distinguish observed evidence from causal claims.
- No production deployment or database migration without explicit approval.

---

### Task 1: Restore signup and Google login

**Files:**
- Modify: `convex/auth.ts`
- Modify: `app/api/auth/providers/route.ts`
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `components/auth/google-button.tsx`
- Modify: `tests/integration/external-integration-failure-contract.test.ts`
- Test: `tests/integration/api-auth-boundaries.test.ts`

**Interfaces:**
- Consumes: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, existing `authClient.signIn.social()`.
- Produces: conditional Google OAuth provider and visible Google signup/login entry points when configured.

- [ ] **Step 1: Change the auth contract test to require conditional Google OAuth**
- [ ] **Step 2: Run the targeted auth tests and confirm the current disabled implementation fails**
- [ ] **Step 3: Restore the provider, buttons, callback plan intent, and configuration-status endpoint**
- [ ] **Step 4: Run auth tests, lint, and type-check for the changed files**
- [ ] **Step 5: Verify local email error handling and the Google redirect start in a browser when credentials are available**

### Task 2: Establish one plan promise catalogue

**Files:**
- Create: `lib/billing/plan-catalog.ts`
- Modify: `lib/config.ts`
- Modify: `lib/billing/plans.ts`
- Modify: `app/(marketing)/pricing/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(dashboard)/dashboard/settings/page.tsx`
- Modify: `app/(marketing)/scan/[id]/page.tsx`
- Test: `tests/unit/plan-catalog.test.ts`
- Test: `tests/integration/plan-promise-contract.test.ts`

**Interfaces:**
- Produces: `PUBLIC_PLANS`, `planByCheckoutKey()`, and `planByStoredKey()` as the only customer-facing plan source.
- Maps: `radar -> starter`, `command -> pro`, `concierge -> agency` while keeping stored keys backward compatible.

- [ ] **Step 1: Add failing catalogue and cross-surface contract tests**
- [ ] **Step 2: Implement the typed catalogue with exact name, price, limits, engines, members, and feature promises**
- [ ] **Step 3: Replace duplicated plan display data in pricing, signup, receipt upsell, and dashboard settings**
- [ ] **Step 4: Run billing, catalogue, and UI contract tests**

### Task 3: Convert evidence into one defensible decision

**Files:**
- Modify: `lib/measurement/dashboard-summary.ts`
- Modify: `convex/dashboard.ts`
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Test: `tests/unit/dashboard-summary.test.ts`
- Test: `tests/convex/dashboard.spec.ts`

**Interfaces:**
- Produces: `decisionBrief` with observed competitor lead, supporting counts, evidence limitation, and one ranked action.
- Consumes: successful current-window observations only; never failed rows or prose-only URLs.

- [ ] **Step 1: Add failing tests for competitor lead, ties, insufficient evidence, and deterministic action ranking**
- [ ] **Step 2: Derive the leading competitor from usable answers where the tracked brand is absent**
- [ ] **Step 3: Return an evidence statement and one action without claiming causation**
- [ ] **Step 4: Render the decision prominently on Overview with a direct Actions link**
- [ ] **Step 5: Run measurement and dashboard regression tests**

### Task 4: Replace methodology theory with an end-to-end case

**Files:**
- Modify: `app/(marketing)/methodology/page.tsx`
- Test: `tests/integration/marketing-proof-contract.test.ts`

**Interfaces:**
- Produces: one clearly labelled, evidence-backed case sequence: question, findings, gap, action, compatible follow-up movement.

- [ ] **Step 1: Add a contract test requiring all five stages and evidence/causality caveats**
- [ ] **Step 2: Replace the illustrative visibility-calculation section with the complete case**
- [ ] **Step 3: Keep methodology rules and confidence explanation available around the case**
- [ ] **Step 4: Verify responsive layout and reduced-motion behavior**

### Task 5: Make the free receipt preview Radar

**Files:**
- Modify: `app/(marketing)/scan/[id]/page.tsx`
- Modify: `components/marketing/free-scan-widget.tsx`
- Create: `components/marketing/radar-preview.tsx`
- Test: `tests/integration/public-scan-radar-preview.test.ts`

**Interfaces:**
- Consumes: the real public Gemini scan receipt.
- Produces: a clearly labelled Radar preview that shows where repeated samples, confidence, engine comparison, source ledger, and next action appear after signup, without fabricating values.

- [ ] **Step 1: Add a failing contract test for real receipt versus clearly labelled Radar preview data**
- [ ] **Step 2: Build the preview from the actual public answer plus explicit locked/unmeasured states**
- [ ] **Step 3: Place the preview after the live answer and route the CTA through signup with brand context**
- [ ] **Step 4: Exercise public scan receipt on desktop and mobile**

### Task 6: Release-quality verification

**Files:**
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Produces: an honest record of passed and blocked checks.

- [ ] **Step 1: Run relevant tests, then the full unit and integration suites**
- [ ] **Step 2: Run lint, app type-check, MCP type-check, and the production webpack build**
- [ ] **Step 3: Exercise signup, login, free scan receipt, pricing, methodology, dashboard overview, and settings in a browser**
- [ ] **Step 4: Inspect console and failed network requests**
- [ ] **Step 5: Run `git diff --check`, review the final diff, and record any credential- or deployment-blocked checks**
