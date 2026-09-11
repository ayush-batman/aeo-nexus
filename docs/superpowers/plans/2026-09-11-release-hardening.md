# Aelo Non-UI Release Hardening Implementation Plan

> **Execution:** Continue inline in this task, completing and checking each step before moving on. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and improve Aelo's non-UI launch readiness without touching production data, production billing, or the production deployment.

**Architecture:** Collapse the Overview page's repeated authenticated Convex reads into one bounded, workspace-authorized summary query built from compact scan metrics. Then verify the five core jobs with a synthetic account against the `woozy-starfish-810` development backend, exercise safe failure paths for unconfigured external providers, review the migration's trust boundaries, and record every gate that still requires credentials or production-data approval.

**Tech Stack:** Next.js App Router, TypeScript, Convex, Better Auth, Vitest, Node test runner, Playwright, Vercel previews

**Spec:** `docs/product-rescue/IMPLEMENTATION_PLAN.md`, `docs/product-rescue/CONVEX_RUNTIME_CHECKPOINT.md`, and the repository `AGENTS.md`

## Global Constraints

- Failed or missing provider evidence must never become a fabricated zero, response, source, or improvement claim.
- Every protected read and write must enforce authentication and workspace membership on the server.
- `/api/v1`, MCP scopes, Stripe, Razorpay, stored evidence, and compatible comparison behavior must remain backward compatible.
- No production data, production billing, destructive database operation, or production deployment is authorized.
- All summary limits must return an explicit partial state instead of silently dropping data.
- Final verification must include tests, lint, both type checks, a production build, browser console/network inspection, and a final diff review.

---

### Task 1: Establish a repeatable latency baseline

**Files:**
- Modify: `scripts/convex/browser-smoke.mjs`
- Create: `tests/integration/dashboard-latency-contract.test.ts`
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Consumes: `AELO_LOCAL_TEST_EMAIL`, `AELO_LOCAL_TEST_PASSWORD`, and the existing local Next server.
- Produces: structured `AELO_PERF_JSON` output containing login, onboarding context, workspace list, and dashboard summary timings.

- [x] **Step 1: Write the failing contract test**

```ts
test('browser smoke emits bounded structured latency samples', async () => {
  const script = await source('scripts/convex/browser-smoke.mjs');
  assert.match(script, /AELO_PERF_JSON/);
  assert.match(script, /api\/dashboard\/stats/);
  assert.match(script, /AbortSignal\.timeout\(20000\)/);
});
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run: `node --test --import tsx tests/integration/dashboard-latency-contract.test.ts`

Expected: failure because `AELO_PERF_JSON` is not emitted.

- [x] **Step 3: Add structured timing output without printing credentials**

```js
if (process.env.AELO_PERF_JSON === '1') {
  console.log(JSON.stringify({ kind: 'aelo-performance', loginMs, timings }));
}
```

- [x] **Step 4: Run three baseline samples against the synthetic test workspace**

Run the local server against the `woozy-starfish-810` development deployment, create a new `@example.test` account with an in-memory random password, and run `scripts/convex/browser-smoke.mjs` with `AELO_PERF_JSON=1`. Record median and range; do not call them p95.

- [x] **Step 5: Run the focused test again**

Run: `node --test --import tsx tests/integration/dashboard-latency-contract.test.ts`

Expected: pass.

### Task 2: Replace repeated Overview reads with one bounded Convex summary

**Files:**
- Create: `convex/dashboard.ts`
- Create: `lib/measurement/dashboard-summary.ts`
- Modify: `convex/schema.ts`
- Modify: `app/api/dashboard/stats/route.ts`
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Modify: `convex/_generated/api.d.ts` through `npx convex codegen`
- Create: `tests/convex/dashboard.spec.ts`
- Create: `tests/unit/dashboard-summary.test.ts`
- Modify: `tests/integration/dashboard-shell-contract.test.ts`

**Interfaces:**
- Consumes: `scanMetrics`, `scans`, `forumThreads`, and `contentAnalyses` for one authorized workspace.
- Produces: `api.dashboard.summary({ workspaceId })` returning `{ status, stats, recentMentions, visibilityMetrics, topThreads }`.

- [x] **Step 1: Write failing pure summary tests**

```ts
test('failed samples and incompatible cohorts never enter visibility change', () => {
  const summary = summarizeDashboardObservations({ current, previous, truncated: false });
  assert.equal(summary.stats.llmVisibility, 50);
  assert.equal(summary.stats.llmVisibilityChange, null);
});
```

- [x] **Step 2: Write failing Convex authorization and truncation tests**

```ts
expect(await asOtherUser.query(api.dashboard.summary, { workspaceId })).rejects.toThrow();
expect(result.status).toBe('partial');
expect(result.stats.llmVisibility).toBeNull();
```

- [x] **Step 3: Implement the pure summary function**

```ts
export function summarizeDashboardObservations(input: DashboardObservationInput): DashboardMeasurementSummary {
  // Reuse aggregateMentionMetric, compareCompatibleMentionMetrics,
  // healthScoreMetric, mentionMetricFromCounts, and shareOfVoiceMetric.
  // Return null measurement fields when input.truncated is true.
}
```

- [x] **Step 4: Implement one tenant query with explicit bounds**

```ts
const MAX_OBSERVATIONS = 5000;
const MAX_SUPPORTING_ROWS = 1000;
const [observations, recentScans, threads, content] = await Promise.all([
  ctx.db.query('scanMetrics').withIndex('by_workspace_created', q => q.eq('workspaceId', workspace._id).gte('createdAt', fourteenDaysAgo)).take(MAX_OBSERVATIONS + 1),
  ctx.db.query('scans').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc').take(20),
  ctx.db.query('forumThreads').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).take(MAX_SUPPORTING_ROWS + 1),
  ctx.db.query('contentAnalyses').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).take(MAX_SUPPORTING_ROWS + 1),
]);
```

Add the additive `by_workspace_created` index on `scanMetrics`, then filter observations to the last fourteen days inside that indexed query. If any bound is exceeded, return `status: 'partial'` and null only the affected metric group; never calculate from a silently truncated set.

- [x] **Step 5: Replace the API route's repeated reads**

```ts
const summary = await fetchAuthQuery(api.dashboard.summary, { workspaceId: context.workspaceId });
return NextResponse.json(summary);
```

- [x] **Step 6: Remove the Overview page's second forum request**

Use `topThreads` from `/api/dashboard/stats`; keep the existing visible error and retry behavior.

- [x] **Step 7: Generate Convex types and run focused tests**

Run: `npx convex codegen`

Run: `node --test --import tsx tests/unit/dashboard-summary.test.ts`

Run: `npm run test:convex -- dashboard.spec.ts`

Expected: all pass.

### Task 3: Measure the latency change and protect it from regression

**Files:**
- Modify: `scripts/convex/browser-smoke.mjs`
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Consumes: the same synthetic account and test deployment used for Task 1.
- Produces: before/after median and range for identical endpoints and sample order.

- [x] **Step 1: Deploy only the Convex query to `woozy-starfish-810`**

Run: `npx convex deploy --env-file .env.convex-test --message "Bounded dashboard summary"` after verifying that `.env.convex-test` names only `woozy-starfish-810`.

- [x] **Step 2: Run the identical three-sample timing sequence**

Run the local Next server against the same development deployment and execute the structured browser smoke script once; it already performs three samples per endpoint.

- [x] **Step 3: Record honest results**

Document the median and observed range. Mark latency improved only if the dashboard median falls; do not claim an SLA, percentile, or global-user result from three local samples.

- [x] **Step 4: Set a generous regression ceiling**

The smoke script exits non-zero only if an individual dashboard request exceeds 20 seconds or returns a non-200 response. Performance trends are reported, not made flaky by a tight wall-clock assertion.

### Task 4: Rehearse the five authenticated product jobs

**Files:**
- Modify: `scripts/convex/browser-smoke.mjs`
- Create: `tests/integration/browser-journey-contract.test.ts`
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Consumes: a synthetic `@example.test` account and the empty test workspace.
- Produces: desktop and mobile evidence for Overview, Prompts & Scans, Sources, Actions, and Reports & Settings.

- [x] **Step 1: Add a failing route-coverage contract**

```ts
for (const path of ['/dashboard', '/dashboard/llm-tracker', '/dashboard/sources', '/dashboard/interventions', '/dashboard/report', '/dashboard/settings']) {
  assert.match(script, new RegExp(path.replaceAll('/', '\\/')));
}
```

- [x] **Step 2: Extend the browser script**

For each route, wait for its named heading, assert no horizontal overflow at 1440×1000 and 390×844, collect page errors and same-origin responses with status 400 or above, and save failure screenshots only.

- [x] **Step 3: Exercise safe empty and failure states**

Confirm the empty workspace shows no fabricated metrics, the scan journey displays the missing-provider error, Sources and Actions expose their empty states, and Reports & Settings render without unauthorized data.

- [x] **Step 4: Run the browser rehearsal**

Run: `AELO_TEST_CORE_JOBS=1 node scripts/convex/browser-smoke.mjs`

Expected: all six routes render at both widths, no page error occurs, and only the deliberately missing provider request may return a handled error.

### Task 5: Verify integration boundaries without adding secrets

**Files:**
- Create: `tests/integration/external-integration-failure-contract.test.ts`
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Consumes: the test deployment with AI, Resend, OAuth, Stripe, and Razorpay credentials absent.
- Produces: proof that missing configuration fails closed and creates no success state.

- [x] **Step 1: Add contract tests for missing configuration**

Assert AI actions return a provider-unavailable failure, email deliveries remain failed or skipped without a provider ID, OAuth is not offered without configured credentials, and payment checkout returns a non-success response without test provider configuration.

- [x] **Step 2: Run focused integration and Convex tests**

Run: `node --test --import tsx tests/integration/external-integration-failure-contract.test.ts`

Run: `npm run test:convex -- billing.spec.ts mail.spec.ts measurement-workflow.spec.ts`

Expected: all pass without contacting a live provider.

- [x] **Step 3: Record credential-dependent gates**

List Gemini, OpenAI, Anthropic, Perplexity, Resend, Google OAuth, Stripe test mode, and Razorpay test mode separately. Never label an untested integration as passing.

### Task 6: Review the migration trust boundaries

**Files:**
- Modify: only files with actionable findings inside `convex/`, `app/api/`, `lib/convex/`, `lib/api-auth.ts`, or `lib/billing/`
- Create or modify: the closest unit, integration, or Convex regression test for every fix
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

**Interfaces:**
- Consumes: the full branch diff against `main`.
- Produces: a severity-ranked finding list, fixes for confirmed P0/P1 issues, and explicit deferred lower-severity items.

- [x] **Step 1: Run the automated trust-boundary searches**

```bash
rg -n "v\.any\(|collect\(|take\(|console\.(log|error)|process\.env|workspaceId|organizationId|isSuperAdmin|role|plan" convex app/api lib/convex lib/api-auth.ts lib/billing
```

- [x] **Step 2: Review authorization paths**

Trace every public Convex function and Next route to `tenantQuery`, `tenantMutation`, `requireWorkspace`, scoped API-key authorization, or an intentionally public boundary. Add a regression test before fixing every confirmed gap.

- [x] **Step 3: Review data-loss and billing paths**

Verify import idempotency, scan persistence status, retry identities, quota reservation, webhook deduplication, stale-event handling, and provider-owned plan mapping. Do not execute provider calls or destructive imports.

- [x] **Step 4: Review measurement logic**

Verify failed samples remain excluded, citation provenance is preserved, comparisons require compatible cohorts and equal sampling proportions, and partial/truncated reads never become improvement claims.

- [x] **Step 5: Fix only confirmed high-impact findings**

Each fix must have a failing regression test, the smallest implementation change, and a focused passing test before continuing.

### Task 7: Run the complete release gate and document blockers

**Files:**
- Modify: `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`
- Modify: `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md` only if the verified procedure changed

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: one honest release-readiness statement and a protected preview; production remains untouched.

- [x] **Step 1: Run the full automated gate**

Run: `npm test`

Run: `npm run lint`

Run: `npm run typecheck`

Run: `npm run typecheck:mcp`

Run: `npm run build -- --webpack`

- [x] **Step 2: Run repository hygiene checks**

Run: `git diff --check`

Run: `git status --short`

Review the final diff against `main`, preserving `.agents/`, `.interface-design/`, and `skills-lock.json` as user-owned or tool-generated files outside release commits.

- [x] **Step 3: Deploy a protected preview only**

Run: `vercel deploy --yes`, verify status `READY`, check the five core marketing routes, authenticated staging journey, API-key 401/403 behavior, and runtime error logs. Do not run `vercel --prod`.

- [x] **Step 4: Report remaining external blockers**

Request one item at a time only after all safe work is complete: test integration credentials first, then explicit approval for a source-data export/import/parity rehearsal. Production promotion remains a separate final approval.
