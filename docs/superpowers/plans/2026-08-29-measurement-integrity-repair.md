# Measurement Integrity Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the reviewed authorization and reliability gaps, then make every customer-facing visibility metric derive from compatible successful samples without inventing zeroes or unsupported change claims.

**Architecture:** Keep provider responses as immutable sample evidence and move aggregation into pure measurement helpers. Cookie and API-key routes validate authority before service-role writes. Multi-row state changes use database functions so the business row and its audit or limit record succeed together. Long provider work uses bounded execution and durable state instead of pretending synchronous request work is background work.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres, Node test runner, Vercel Functions, React.

**Spec:** `docs/product-rescue/` and the findings from the `main...codex/product-rescue` staff review.

## Global Constraints

- Preserve multi-sample evidence, raw citations, sample counts, failures, and confidence intervals.
- Never convert missing, failed, or incompatible evidence into a measured zero.
- Preserve `/api/v1`, MCP, Stripe, and Razorpay compatibility except where the old response is demonstrably dishonest.
- Do not deploy or apply migrations to a live database.
- Do not commit `.agents/`, `skills-lock.json`, credentials, environment files, or generated build output.
- Finish logic and reliability work before visual redesign.

---

### Task 1: Enforce measurement and schedule authority

**Files:**
- Modify: `app/api/interventions/[id]/measure/route.ts`
- Modify: `app/api/llm/scheduled/route.ts`
- Modify: `app/api/llm/scheduled/[id]/route.ts`
- Create: `supabase/migrations/033_secure_scheduled_scan_mutations.sql`
- Modify: `tests/integration/actions-contract.test.ts`
- Modify: `tests/integration/scheduled-scan-contract.test.ts`

**Interfaces:**
- Consumes: `requireWorkspaceRole(context, ['owner', 'admin', 'editor'])`.
- Produces: cookie-authenticated schedule routes that validate roles, engines, prompt length, frequency, workspace, and entitlements before service-role writes.

- [ ] **Step 1: Add failing source-contract tests**

```ts
assert.match(measureRoute, /requireWorkspaceRole/);
assert.match(scheduleRoute, /getEntitlements/);
assert.match(scheduleRoute, /getAvailablePlatforms/);
assert.match(scheduleRoute, /createAdminClient/);
assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON public\.scheduled_scans FROM authenticated/i);
```

- [ ] **Step 2: Run the focused integration tests and confirm failure**

Run: `npm run test:integration -- tests/integration/actions-contract.test.ts tests/integration/scheduled-scan-contract.test.ts`

- [ ] **Step 3: Add server-side role and entitlement validation**

Return `403` for viewers, reject unknown/unavailable engines, cap prompts at 2,000 characters and competitors at 20, and allow only daily/weekly/monthly frequencies.

- [ ] **Step 4: Revoke direct authenticated schedule mutations**

Migration 033 removes browser-table writes while preserving organization-member reads; route mutations use the service role only after authorization.

- [ ] **Step 5: Run focused tests and commit the batch**

Run: `npm run test:integration -- tests/integration/actions-contract.test.ts tests/integration/scheduled-scan-contract.test.ts`

### Task 2: Restore comparable Action receipts

**Files:**
- Modify: `app/api/interventions/[id]/measure/route.ts`
- Modify: `lib/measurement/comparison.ts`
- Modify: `tests/unit/measurement-comparison.test.ts`
- Modify: `tests/integration/actions-contract.test.ts`

**Interfaces:**
- Consumes: `VisibilityMeasurementRun.region`, `.mode`, `.scorerVersion`, `.contractVersion`, and each engine's `providerModels`.
- Produces: follow-up snapshot points containing all five compatibility fields required by `compareVisibilitySnapshots`.

- [ ] **Step 1: Add a failing route-level regression test**

Assert the route writes `provider_model`, `measurement_region`, `measurement_mode`, `scorer_version`, and `contract_version` into each impact point.

- [ ] **Step 2: Add a pure comparison fixture matching the route output**

The fixture must produce one comparable pair and an `improved` verdict for 0/8 versus 8/8 mentions.

- [ ] **Step 3: Store exact compatibility metadata**

Only create a comparable point when an engine has one exact provider model. Preserve multiple-model evidence as inconclusive rather than selecting an arbitrary model.

- [ ] **Step 4: Run unit and integration tests**

Run: `npm run test:unit -- tests/unit/measurement-comparison.test.ts`

### Task 3: Make absent evidence distinct from zero

**Files:**
- Modify: `app/api/v1/scan/route.ts`
- Modify: `app/api/v1/visibility/overview/route.ts`
- Modify: `app/api/v1/prompts/gaps/route.ts`
- Modify: `app/api/v1/visibility/trend/route.ts`
- Modify: `mcp-server/src/client.ts`
- Modify: `tests/integration/api-auth-boundaries.test.ts`
- Create: `tests/unit/measurement-metrics.test.ts`
- Create: `lib/measurement/metrics.ts`

**Interfaces:**
- Produces: `aggregateMentionMetric(rows)` returning `{ status, mentions, samples, mentionRate, confidence }`, with `mentionRate: null` when `samples === 0`.
- Produces: API responses where unmeasured/all-failed is explicit and never serialized as measured `0`.

- [ ] **Step 1: Add failing tests for zero versus missing**

```ts
assert.equal(aggregateMentionMetric([]).mentionRate, null);
assert.equal(aggregateMentionMetric([{ mentioned: false }]).mentionRate, 0);
```

- [ ] **Step 2: Add all-provider-failure contract coverage**

Assert `/api/v1/scan` does not use `measurement.visibilityScore ?? 0` and returns an explicit provider failure.

- [ ] **Step 3: Implement the pure aggregate and update API consumers**

Gaps retain unmeasured rows with `visibility: null`; trend omits empty days; overview returns `overall: null` when no engine is tracked.

- [ ] **Step 4: Preserve MCP failure detail and run tests**

Run: `npm run test:unit -- tests/unit/measurement-metrics.test.ts`
Run: `npm run test:integration -- tests/integration/api-auth-boundaries.test.ts`

### Task 4: Unify the visibility definition

**Files:**
- Modify: `lib/measurement/metrics.ts`
- Modify: `lib/data-access.ts`
- Modify: `lib/measurement/service.ts`
- Modify: `lib/analytics/report.ts`
- Modify: `lib/weekly-inbox.ts`
- Modify: `tests/unit/measurement-metrics.test.ts`
- Modify: `tests/unit/measurement-service.test.ts`
- Modify: `tests/unit/weekly-inbox.test.ts`

**Interfaces:**
- Produces: one primary visibility metric: successful-sample brand mention rate, reported as 0–100 only at UI/API boundaries.
- Produces: position, sentiment, citation, and analyzer confidence as separate diagnostics, not hidden weights inside visibility.

- [ ] **Step 1: Add consistency tests**

The same four rows must yield the same mention rate in canonical runs, dashboard metrics, reports, trends, and prompt gaps.

- [ ] **Step 2: Remove divergent weighted visibility formulas from active paths**

Do not mix sentiment, list position, own-domain citations, or analyzer self-confidence into the metric named visibility. Retain a versioned legacy scorer only for the public free-scan response if backward compatibility requires it, and label it clearly.

- [ ] **Step 3: Exclude incompatible legacy cohorts from change claims**

Current values may show all successful samples with a clear window; deltas and verdicts require matching model, region, mode, scorer, contract, prompt, and engine cohorts.

- [ ] **Step 4: Run metric tests**

Run: `npm run test:unit -- tests/unit/measurement-metrics.test.ts tests/unit/measurement-service.test.ts tests/unit/weekly-inbox.test.ts`

### Task 5: Correct composite and share-of-voice metrics

**Files:**
- Modify: `lib/data-access.ts`
- Modify: `lib/measurement/metrics.ts`
- Create: `tests/unit/dashboard-metrics.test.ts`

**Interfaces:**
- Produces: sample-weighted overall visibility with a combined Wilson interval.
- Produces: share of voice as brand mentions divided by brand plus normalized competitor mention opportunities, with a real previous-window delta or `null`.
- Produces: AEO health as nullable component data unless every advertised component is measured; no missing component silently contributes zero.

- [ ] **Step 1: Add tests for engine weighting and missing components**

One engine with 100 samples must not receive the same weight as one engine with one sample unless the response explicitly reports a macro-average. Missing forum/content data must not depress a score presented as complete.

- [ ] **Step 2: Implement named micro and macro aggregates**

Use sample-weighted mention rate for the headline. If an engine-balanced macro-average is useful, expose it separately with its denominator.

- [ ] **Step 3: Replace the hard-coded zero share-of-voice change**

Calculate both adjacent seven-day windows using the same normalization, or return `null` when either side lacks evidence.

- [ ] **Step 4: Run dashboard metric tests**

Run: `npm run test:unit -- tests/unit/dashboard-metrics.test.ts`

### Task 6: Make Action updates and brand limits atomic

**Files:**
- Create: `supabase/migrations/034_atomic_actions_and_workspace_limits.sql`
- Modify: `app/api/interventions/route.ts`
- Modify: `app/api/interventions/[id]/route.ts`
- Modify: `app/api/interventions/[id]/measure/route.ts`
- Modify: `app/api/workspaces/route.ts`
- Modify: `tests/integration/actions-contract.test.ts`
- Modify: `tests/integration/api-auth-boundaries.test.ts`

**Interfaces:**
- Produces: service-role-only database functions that update an Action plus its event in one transaction and create a workspace only when the plan-owned brand limit permits it under an organization-row lock.

- [ ] **Step 1: Add migration contract tests for transaction functions and grants**
- [ ] **Step 2: Implement database functions with explicit validation and organization locking**
- [ ] **Step 3: Switch routes from split writes/count-then-insert to the functions**
- [ ] **Step 4: Run focused integration tests**

### Task 7: Bound provider work and repair scheduler leasing

**Files:**
- Modify: `lib/ai/llm-scanner.ts`
- Modify: `lib/measurement/service.ts`
- Modify: `app/api/cron/process-scans/route.ts`
- Modify: `supabase/migrations/028_claim_scheduled_scans.sql` only through a new additive follow-up migration
- Create: `supabase/migrations/035_reliable_scan_leases.sql`
- Modify: `tests/unit/measurement-service.test.ts`
- Modify: `tests/integration/scheduled-scan-contract.test.ts`

**Interfaces:**
- Produces: provider calls with explicit deadlines and bounded parallel execution.
- Produces: one-at-a-time or renewable scheduled-scan leases whose duration exceeds a single bounded job.

- [ ] **Step 1: Add timeout, partial-result, and lease-expiry tests**
- [ ] **Step 2: Add provider deadlines and bounded engine concurrency**
- [ ] **Step 3: Persist completed sample batches incrementally**
- [ ] **Step 4: Claim only work the current invocation can finish, and renew before expiry**
- [ ] **Step 5: Run focused reliability tests**

### Task 8: Remove synchronous “background” work from workspace creation

**Files:**
- Create: `supabase/migrations/036_activation_jobs.sql`
- Create: `lib/measurement/jobs.ts`
- Create: `app/api/cron/process-measurement-jobs/route.ts`
- Modify: `app/api/workspaces/route.ts`
- Modify: `vercel.json`
- Modify: `tests/integration/api-auth-boundaries.test.ts`

**Interfaces:**
- Produces: an idempotent activation job keyed by workspace ID and purpose.
- Produces: workspace creation response with explicit `measurementStatus: 'queued'`.

- [ ] **Step 1: Add a test proving workspace creation does not await providers**
- [ ] **Step 2: Add the durable job table and claim function**
- [ ] **Step 3: Enqueue atomically with workspace creation**
- [ ] **Step 4: Add the authenticated cron worker with retry state**
- [ ] **Step 5: Run route and job tests**

### Task 9: Verification and documentation

**Files:**
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`
- Modify: `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md`

- [ ] **Step 1: Run unit, integration, lint, both type-checks, and production build**

```bash
npm test
npm run lint
npm run typecheck
npm run typecheck:mcp
npm run build -- --webpack
```

- [ ] **Step 2: Exercise owner/editor/viewer boundaries and measurement states in an authorized local browser**
- [ ] **Step 3: Inspect console and network failures at mobile and desktop widths**
- [ ] **Step 4: Review `git diff --check`, `git diff main...HEAD`, and `git status --short`**
- [ ] **Step 5: Record exact results, migration order, rollback, and remaining limits**

### Task 10: Visual redesign after integrity gates

**Files:**
- To be selected after browser evidence identifies the highest-friction primary screens.

**Interfaces:**
- Consumes: stable metric names and explicit empty/partial/error states from Tasks 3–5.
- Produces: a calmer evidence-first UI without changing measurement semantics.

- [ ] **Step 1: Capture authenticated before screenshots at 390 and 1440 pixels**
- [ ] **Step 2: Define the visual direction using the frontend and interface design skills**
- [ ] **Step 3: Redesign Overview, Prompts & Scans, Sources, Actions, and Reports & Settings in that order**
- [ ] **Step 4: Run responsive, keyboard, reduced-motion, console, and network checks**
