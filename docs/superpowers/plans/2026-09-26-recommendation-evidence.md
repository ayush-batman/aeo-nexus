# Recommendation Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate an observed brand mention from an answer that actually recommends the brand, without changing the existing mention-based visibility score.

**Architecture:** Extend the existing single sentiment-analysis call to classify recommendation context and retain a short verbatim supporting span. Treat missing, invalid, or legacy classification as unassessed. Persist the field additively and show it beside, never in place of, the mention evidence.

**Tech Stack:** Next.js, TypeScript, Better Auth, Convex, Node test runner, Vitest.

**Spec:** `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md` sections B, G, and J.

## Global Constraints

- Visibility remains the observed mention rate over successful samples; do not reinterpret old scores.
- Keep raw provider answers and structured provider citations unchanged.
- Failed, old, or invalid recommendation analysis must be `unassessed`, not `not_recommended`.
- Keep this in the existing analyzer request so normal scans gain no extra provider round-trip.
- Add Convex fields as optional to keep imported and existing rows valid.
- Do not push backend changes to a deployment or test with production data without explicit approval.

---

## File map

- `lib/ai/ai-analyzer.ts`: classify recommendation context and validate a quote from the raw answer.
- `lib/ai/llm-scanner.ts`: carry the classification in a successful scan.
- `lib/measurement/types.ts` and `lib/measurement/service.ts`: carry it in per-sample evidence, leaving score arithmetic unchanged.
- `convex/lib/measurementContract.ts`, `convex/schema.ts`, `convex/measurements.ts`, `convex/publicScans.ts`: accept and persist optional classification fields.
- `app/(marketing)/scan/[id]/page.tsx`, `components/dashboard/scan-receipt-drawer.tsx`: show recommendation separately from mention and preserve legacy unassessed states.
- `tests/unit/scanner-integrity.test.ts`, `tests/unit/measurement-service.test.ts`, `tests/convex/public-scans.spec.ts`, and receipt-rendering tests: prove negative, positive, missing, and old-data behavior.

### Task 1: Classify only supported recommendation claims

**Files:** Modify `lib/ai/ai-analyzer.ts`, `lib/ai/llm-scanner.ts`; test `tests/unit/scanner-integrity.test.ts`.

**Interfaces:** Produce `recommendationStatus: 'recommended' | 'not_recommended' | 'unassessed' | 'not_mentioned'`, `recommendationEvidence: string | null`, and `recommendationMethod: string | null` from `analyzeWithAI`; copy them to `ScanResult`.

- [x] Write failing tests with synthetic analyzer JSON for positive, negative, absent, and made-up evidence.
- [x] Run the focused test and confirm the new assertions fail.
- [x] Add recommendation fields to the existing analyzer response and require a short, verbatim brand-bearing quote.
- [x] Bump the analyzer prompt version; leave the mention scorer unchanged.
- [x] Run the focused test and confirm there is no second analyzer request. Brand-absent answers now skip this request entirely.

### Task 2: Persist additive sample evidence

**Files:** Modify `lib/measurement/types.ts`, `lib/measurement/service.ts`, `convex/lib/measurementContract.ts`, `convex/schema.ts`, `convex/measurements.ts`, `convex/publicScans.ts`; test `tests/unit/measurement-service.test.ts`, `tests/convex/public-scans.spec.ts`.

**Interfaces:** `ScanResult` recommendation fields are optional at the Convex boundary for old records. New successful samples carry the status; failed samples carry `unassessed` and no quote. Public receipts return `recommendation_status` and `recommendation_evidence` with null for legacy rows.

- [x] Test per-sample status, unchanged mention score, and a legacy public row.
- [x] Confirm the new assertions initially fail.
- [x] Add optional validators and schema fields; reject unbounded or unsupported quotes and inconsistent absent-brand states on persistence. Do not backfill old rows.
- [x] Re-run focused tests and the app type-check.

### Task 3: Explain the distinction in receipts

**Files:** Modify `app/(marketing)/scan/[id]/page.tsx`, `components/dashboard/scan-receipt-drawer.tsx`; test receipt-rendering tests under `tests/unit` and `tests/integration`.

**Interfaces:** The UI continues to say whether the brand was named, plus a separate recommendation label. An unassessed or legacy record says “Recommendation not assessed,” not “Not recommended.” A non-recommendation displays its supporting answer excerpt.

- [x] Test shared recommendation labels, including old and unassessed results.
- [ ] Add a rendered-component test for all labels. The existing tests cover the label function, but not every rendered state.
- [x] Render a separate label and quote, retaining the raw answer and citation list without a positive/negative color for unassessed.
- [x] Re-run all gates after code edits: 210 Node tests, 61 Convex tests, lint, both type-checks, and production build passed.
- [ ] Verify a newly classified receipt in a local browser after an approved non-production backend deployment. An old Buffer receipt was verified at desktop and mobile widths with no page, console, or network errors.
- [x] Review `git diff --check`, final diff, and status; no unrelated files or secret files are staged. Do not deploy without approval.
- [ ] Commit and push the scoped change after review.

## Self-review

- The Buffer counterexample is represented without altering the mention score.
- Legacy rows remain valid and explicitly unassessed.
- The recommendation field is separately supported by a raw-answer span.
- No second analysis request is introduced, protecting latency.
