# Aelo Real-World QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that a real buyer can turn a real website into evidence-backed AI-visibility decisions, and fix confirmed P0/P1 defects without mistaking code checks for product proof.

**Architecture:** Exercise the protected Vercel preview against the `aelo-test` Convex deployment, never production. Preserve each observation's prompt, engine, model, raw answer, provider citation metadata, and visible result so the displayed metrics can be calculated independently. Treat first-time auth, website understanding, measurement, and action quality as separate boundaries; a blocked boundary remains explicitly unverified.

**Tech Stack:** Next.js 16, React, Convex, Better Auth, Gemini test credential, Playwright, Node test runner, Vitest.

**Spec:** `/Users/ayush/.codex/attachments/e565f432-46da-4676-af83-98296fe64b96/Pasted text.txt`

**Execution status, 2026-09-26:** The real public Buffer/Gemini path, website auto-fill, saved receipts, independent source check, focused fixes, full tests, lint, type-checks, and build are complete. The authenticated Buffer project, multi-engine packet, post-fix browser sweep, and protected-preview release remain unverified because test email delivery and a disposable verified test login are unavailable; see `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`.

## Global Constraints

- Use only `woozy-starfish-810` and the protected preview; do not use production data or billing.
- Use a real public business website and real provider answers; do not insert synthetic scan records or substitute mocks.
- Provider citations require structured provider evidence; URLs found only in prose are `link_mentioned`.
- Missing or failed provider evidence is not a measured zero.
- Do not deploy production or change production environment variables.

---

### Task 1: Establish the evidence baseline

**Files:**
- Read: `app/(dashboard)/onboarding/page.tsx`, `app/api/onboarding/decision-packet/route.ts`, `app/api/scan/public/route.ts`
- Read: `convex/measurementWorkflow.ts`, `convex/measurementActions.ts`, `convex/publicScanActions.ts`, `lib/ai/llm-scanner.ts`
- Create: `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`

**Interfaces:**
- Consumes: protected preview and `aelo-test` test backend.
- Produces: a route-to-data map and test-environment inventory for every later task.

- [ ] Verify the preview and Convex deployment names without printing secrets.
- [ ] Trace entry points through storage and the result reader; record each boundary in the QA report.
- [ ] Record a real business site's official homepage, product, and pricing URLs as independent ground truth.
- [ ] Commit only the QA report after it contains observed outcomes, not anticipated passes.

### Task 2: Exercise the first-time customer journey

**Files:**
- Read: `app/(auth)/signup/page.tsx`, `convex/auth.ts`, `convex/authActions.ts`, `app/(dashboard)/onboarding/page.tsx`
- Read: `components/marketing/free-scan-widget.tsx`, `app/(marketing)/scan/[id]/page.tsx`
- Modify: `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`

**Interfaces:**
- Consumes: Task 1's verified preview and website.
- Produces: browser/API response receipts and the exact last successful customer step.

- [ ] Submit one disposable `@example.test` signup through the preview and record the status and verification-link outcome.
- [ ] Check Google provider availability without using a personal Google account.
- [ ] Run one bounded real public Gemini answer for the selected business with a natural buyer question; retain its scan ID and result URL.
- [ ] If verification or measurement fails, record the response and visible customer message; do not fabricate a completed account or scan.

### Task 3: Independently audit the saved answer

**Files:**
- Read: `lib/ai/llm-scanner.ts`, `lib/ai/citation-provenance.ts`, `lib/measurement/metrics.ts`, `lib/measurement/decision-packet.ts`
- Read: `convex/publicScans.ts`, `lib/convex/public-scan.ts`, `app/api/scan/public/[id]/route.ts`
- Modify: `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`

**Interfaces:**
- Consumes: Task 2's real scan ID, raw answer, and structured citation data.
- Produces: a ground-truth table comparing manual classification with Aelo's persisted and rendered claims.

- [ ] Save the raw answer and provider metadata to the QA report with appropriate redaction of any secret material.
- [ ] Classify brand mention, recommendation, competitor mention/recommendation, cited URLs, and URL provenance by hand.
- [ ] Recalculate every available score from successful observations and compare it to the receipt and dashboard.
- [ ] Mark unavailable metrics as unverified instead of inferring their correctness from tests.

### Task 4: Probe failure and adversarial boundaries

**Files:**
- Read: `tests/unit/scanner-integrity.test.ts`, `tests/integration/public-scan-radar-preview.test.ts`, `tests/convex/public-scans.spec.ts`
- Modify: focused tests only for a demonstrated classification or persistence defect.
- Modify: `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`

**Interfaces:**
- Consumes: Task 3's observations and the real failure states from Task 2.
- Produces: a pass/fail matrix for ambiguous mentions, recommendations, citations, duplicate requests, timeout, and partial failure.

- [ ] Inspect existing adversarial fixtures and identify cases not represented.
- [ ] For a confirmed defect, add a failing minimal test with the exact raw answer and expected classification before changing production code.
- [ ] Keep provider failure, no citation, and insufficient sample counts distinct in the UI and saved receipt.

### Task 5: Fix proven defects and re-run the scenario

**Files:**
- Modify: only the owning module identified by the failing Task 4 test.
- Test: the failing test from Task 4 plus `npm test`.
- Modify: `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`.

**Interfaces:**
- Consumes: a reproducible P0/P1 or safe P2 failure from Task 2–4.
- Produces: a passing regression test and a fresh real-world receipt where the changed boundary is provider-dependent.

- [ ] Make the minimal correction after the failing test demonstrates the problem.
- [ ] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run typecheck:mcp`, and `npm run build -- --webpack`.
- [ ] Re-run the changed browser/API path at 390px and 1440px; check console and failed same-site requests.
- [ ] Review `git diff --check`, the final diff, and status before a scoped commit.
- [ ] Publish a protected preview only after local checks pass; do not promote production.

## Self-review

The plan covers every requested QA phase through the pipeline map, first-time run, raw-answer audit, adversarial matrix, and final verdict. A blocked auth or provider boundary must be reported as such, not converted into a pass by reading code or using a seeded record. Any additional fix discovered during execution receives its own failing test and narrow diff under Task 5.
