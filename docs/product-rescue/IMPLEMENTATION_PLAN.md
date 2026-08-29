# Aelo Product Rescue Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with a fresh review gate after each task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair Aelo’s confirmed security, measurement-trust, reliability, activation, accessibility, and release-gate failures without rewriting the product or breaking its public API, MCP, billing, or stored data.

**Architecture:** Establish four narrow boundaries first: immutable tenant/billing fields, verified billing transitions, versioned measurement/provenance logic, and reliable scan execution. Existing routes become adapters over those boundaries. UI work follows only after the data contract is safe and tested.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase/Postgres/RLS, Node built-in test runner via `tsx`, Stripe, Razorpay, OpenAI/Anthropic/Google/Perplexity, Tailwind 4, Radix UI.

**Spec:** `docs/product-rescue/00-executive-summary.md`, `03-technical-audit.md`, `05-prioritized-roadmap.md`, `06-test-and-acceptance-plan.md`, and the user’s implementation brief.

## Global Constraints

- Branch: `codex/product-rescue`.
- No production data changes or deployment.
- Backward-compatible database migrations with mitigation/rollback notes.
- Preserve `/api/v1`, MCP behavior, stored data, Razorpay, and Stripe unless the approved rescue explicitly changes unsafe behavior.
- No weakening of authentication, validation, types, lint, tests, or build gates.
- No new framework or major dependency; use the existing `tsx` package and Node test runner.
- Each batch gets its own regression tests, browser evidence, diff review, progress entry, and commit.

---

### Task 1: Establish the test and release baseline

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `next.config.mjs`
- Create: `tests/helpers/*`
- Create: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Produces scripts `typecheck`, `test:unit`, `test:integration`, and `test`.
- Production build no longer skips TypeScript errors.

- [ ] Record branch, commit, status, Node/npm versions, disk state, and current command failures.
- [ ] Add Node/tsx test scripts without adding dependencies.
- [ ] Separate root app and MCP type-check boundaries so each reports its own real errors.
- [ ] Remove `ignoreBuildErrors`; verify the build fails on existing type errors for the correct reason.
- [ ] Commit documentation/baseline separately from functional security changes.

### Task 2: Lock tenant and billing authority at the database boundary

**Files:**
- Create: `supabase/migrations/025_lock_sensitive_identity_and_billing_fields.sql`
- Create: `tests/integration/rls-sensitive-fields.test.ts`
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Client users may update only safe profile/organization display fields.
- `users.org_id`, `users.role`, `users.is_super_admin`, `organizations.plan`, and provider billing IDs remain server-owned.

- [ ] Write failing policy/SQL assertions for sensitive-field immutability and cross-tenant rejection.
- [ ] Replace broad update policies with safe column-scoped RPC/privilege rules plus an immutable-field trigger as defense in depth.
- [ ] Document deployment order, existing-row audit query, and rollback mitigation.
- [ ] Run migration against a clean disposable database when available; otherwise record the exact environment block.
- [ ] Commit as the first security batch.

### Task 3: Make billing transitions fail closed and idempotent

**Files:**
- Create: `lib/billing/plans.ts`
- Create: `lib/billing/webhook-events.ts`
- Modify: `app/api/webhooks/razorpay/route.ts`
- Modify: `app/api/stripe/webhook/route.ts`
- Test: `tests/unit/billing-plans.test.ts`
- Test: `tests/integration/billing-webhooks.test.ts`

**Interfaces:**
- `resolvePlanFromProvider(input): Plan | null` uses a server-owned allowlist.
- `applyBillingEvent(event): Promise<BillingApplyResult>` verifies tenant binding and idempotency before plan mutation.

- [ ] Add failing fixtures for missing/invalid signatures, unknown plan/price, wrong amount/currency/status, replay, and database failure.
- [ ] Make missing Razorpay signature/secret fail closed and compare signatures safely.
- [ ] Use service-role Supabase only after provider validation; check affected rows/errors.
- [ ] Store processed provider event IDs in a backward-compatible migration.
- [ ] Verify Stripe and Razorpay test fixtures; commit separately.

### Task 4: Correct brand/domain matching and citation provenance

**Files:**
- Create: `lib/ai/brand-matching.ts`
- Create: `lib/ai/citation-provenance.ts`
- Modify: `lib/ai/ai-analyzer.ts`
- Modify: `lib/ai/llm-scanner.ts`
- Modify: `lib/types.ts`
- Test: `tests/unit/brand-matching.test.ts`
- Test: `tests/unit/citation-provenance.test.ts`

**Interfaces:**
- `matchesBrand(text, aliases): BrandMatch` uses normalized token/domain aliases, never deletion variants.
- `normalizeBrandHostname(value): string | null` enforces exact/subdomain boundaries.
- `CitationEvidence` distinguishes `provider_citation`, `link_mentioned`, and `unverified` with provider/sample provenance.

- [ ] Add the Aelo/AEO, short-brand, punctuation, Unicode, and hostname golden corpus.
- [ ] Replace deletion/substrings with explicit normalized alias matching.
- [ ] Preserve legacy citation fields while adding provenance fields so stored/API data remains readable.
- [ ] Use structured provider citations where available; relabel regex URLs as links mentioned.
- [ ] Run unit and contract tests; commit separately.

### Task 5: Remove dangerous production paths and centralize API authorization

**Files:**
- Delete: `app/api/setup-test-user/route.ts`
- Modify: `lib/api-v1.ts`
- Modify: `lib/entitlements.ts`
- Modify: `app/api/v1/scan/route.ts`
- Modify: API-key/workspace mutation routes
- Test: `tests/integration/api-auth-boundaries.test.ts`

**Interfaces:**
- Measurement routes require `measure`.
- Cookie and API-key callers share server-owned RBAC/entitlement checks.

- [ ] Assert the production route manifest excludes the test-user endpoint.
- [ ] Add failing 401/403/429/workspace-isolation/quota tests.
- [ ] Require `measure`, reserve quota atomically, and enforce roles before service-role writes.
- [ ] Return partial engine and persistence status without changing existing success fields.
- [ ] Commit separately.

### Task 6: Repair scheduled scans, rate limiting, SSRF, and analytics ingest

**Files:**
- Modify: `lib/rate-limit.ts`
- Modify: `app/api/v1/scans/schedule/route.ts`
- Modify: `app/api/cron/process-scans/route.ts`
- Modify: `lib/crawlers.ts`
- Modify: `app/api/analytics/track/route.ts`
- Test: corresponding unit/integration suites

- [ ] Reject/resolve empty engine schedules and add cron idempotent claim behavior.
- [ ] Wire existing Upstash dependencies with an explicit local-safe fallback that never claims cross-instance guarantees.
- [ ] Block private/link-local/metadata/redirected SSRF targets with DNS and response limits.
- [ ] Authenticate/sign analytics ingestion and bound its schema/body/rate.
- [ ] Commit reliability fixes in reviewable sub-batches.

### Task 7: Establish the canonical measurement contract

**Files:**
- Create: `lib/measurement/types.ts`
- Create: `lib/measurement/service.ts`
- Create: `lib/measurement/confidence.ts`
- Modify: scanner/API/onboarding/dashboard/interventions/schedules/MCP adapters
- Test: unit, contract, and integration fixtures

- [ ] Define versioned run, engine, sample, failure, citation, confidence, and persistence fields.
- [ ] Add fixtures for full, partial, all-failed, and untracked runs.
- [ ] Move multi-sample execution/aggregation behind one service while keeping legacy response fields.
- [ ] Replace onboarding analyzer confidence and single-point intervention verdicts.
- [ ] Add comparable-cohort rules and `inconclusive` verdict.
- [ ] Commit contract/service before UI adapters.

### Task 8: Repair activation and repeat-use journey

**Files:**
- Modify: onboarding, dashboard, tracker, Insights/Interventions, navigation, API routes
- Create: focused decision-packet and Actions components/services
- Test: Playwright journey coverage

- [ ] Onboarding generates 3–5 editable high-intent prompts and produces one decision packet.
- [ ] Merge Insights/Interventions into a persisted Actions queue.
- [ ] Simplify navigation to five user jobs while keeping old routes reachable.
- [ ] Add weekly change/decision inbox and preserve selected pricing plan.
- [ ] Capture desktop/mobile before-and-after evidence; commit each coherent user journey.

### Task 9: Accessibility, state handling, and responsive shell

**Files:**
- Modify: dashboard shell/sidebar/header, auth/onboarding/free scan forms, dialogs, shared controls, semantic tokens
- Add: route loading/error components and accessibility tests

- [ ] Implement responsive mobile drawer and shared desktop sidebar offset.
- [ ] Associate labels, use semantic controls, move dialogs to Radix, restore focus, add skip link.
- [ ] Meet hit-target, contrast, reduced-motion, and keyboard requirements.
- [ ] Distinguish loading, empty, error, partial, stale, and retry states.
- [ ] Run browser/axe/keyboard checks at 390, 768, 1024, and 1440 widths.

### Task 10: Final verification, deployment notes, and rollback

**Files:**
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`
- Create: `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md`
- Add/update: CI workflow only after local commands are stable

- [ ] Run clean install, lint, app/MCP type-check, unit/integration/E2E, clean migrations, and production build.
- [ ] Review console/network logs and final diff; classify every remaining failure.
- [ ] Document migration ordering, feature flags, monitoring, rollback, and no-deploy status.
- [ ] Record commit hashes and ordered next-cycle recommendations.

