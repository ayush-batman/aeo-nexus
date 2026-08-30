# Aelo Convex Backend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace every Aelo Supabase database and authentication dependency with Convex while preserving tenant security, measurement truth, billing safety, /api/v1, MCP, and public URLs.

**Architecture:** Convex owns application data, Better Auth identity, tenant authorization, durable workflows, rate limits, scheduled work, and external-service actions. Next.js remains the UI and a thin compatibility edge for current API and webhook URLs; it contains no authoritative business mutations after migration.

**Tech Stack:** Next.js 16 App Router, TypeScript 5.9, Convex, @convex-dev/better-auth, convex-helpers, @convex-dev/rate-limiter, @convex-dev/workflow, @convex-dev/workpool, Stripe, Razorpay, Resend, OpenAI/Azure OpenAI, Gemini, Claude, Perplexity.

**Spec:** docs/product-rescue/CONVEX_MIGRATION_SPEC.md

## Global Constraints

- Do not deploy production or read/write production data without explicit approval.
- Preserve /api/v1, MCP behavior, public receipt URLs, API-key format, 401/403/409/429/502 behavior, Stripe, and Razorpay compatibility.
- Never fabricate provider results, citations, confidence, sample counts, or comparisons.
- Use Convex object-form functions with argument and return validators.
- Use indexes for tenant and lookup reads; no unbounded collection on growing tables.
- Keep external APIs inside Node actions and persist through internal mutations.
- Preserve user-owned .agents/ and skills-lock.json; never commit secrets or generated auth keys.
- Keep each commit scoped, reversible, and independently testable.

---

## File map

### Convex platform

- convex/convex.config.ts — registers Better Auth, rate limiter, workflow, and workpool.
- convex/schema.ts — all Aelo application tables and indexes.
- convex/validators.ts — enum, evidence, receipt, and API validators.
- convex/auth.config.ts — Better Auth JWT issuer registration.
- convex/auth.ts and convex/http.ts — Better Auth configuration and routes.
- convex/lib/tenant.ts — authenticated context and role enforcement.
- convex/lib/publicIds.ts — UUID public IDs and lookup rules.
- convex/organizations.ts, workspaces.ts, products.ts — tenant domains.
- convex/scans.ts, measurementActions.ts, measurementWorkflow.ts — durable evidence execution.
- convex/apiKeys.ts and apiV1.ts — API-key authorization and API-facing operations.
- convex/billing.ts and billingActions.ts — verified, idempotent billing.
- convex/actions.ts, alerts.ts, digests.ts, crons.ts — work tracking and scheduled work.
- convex/forum.ts, crawlers.ts, content.ts — discovery and audits.
- convex/publicScans.ts, newsletter.ts, attribution.ts — anonymous flows.
- convex/imports.ts — idempotent import batches and parity summaries.

### Next.js integration

- app/ConvexClientProvider.tsx — browser provider.
- lib/auth-client.ts and lib/auth-server.ts — Better Auth browser/server helpers.
- lib/convex/server.ts — authenticated and internal Convex clients for Route Handlers.
- lib/convex/compat.ts — public-ID and error-to-HTTP mapping.
- app/api/auth/[...all]/route.ts — Better Auth proxy.
- Existing app/api routes — thin Convex adapters.
- Existing dashboard pages — Convex reads without UI redesign.

### Migration and verification

- scripts/convex/export-supabase.ts — read-only JSONL export and manifest.
- scripts/convex/import-convex.ts — bounded resumable import.
- scripts/convex/check-parity.ts — counts and safe aggregate comparison.
- tests/unit/convex-*.test.ts — schema and pure-logic contracts.
- tests/integration/convex-*.test.ts — tenant, API, migration, billing, and workflow contracts.
- docs/product-rescue/CONVEX_CUTOVER_AND_ROLLBACK.md — staging and production procedure.

---

### Task 1: Install Convex and establish verification

**Files:**
- Modify: package.json
- Modify: package-lock.json
- Modify: .gitignore
- Create: convex.json
- Test: tests/unit/convex-release-config.test.ts

**Interfaces:**
- Produces scripts convex:dev, convex:codegen, and convex:check.

- [ ] **Step 1: Write the failing release test**

    test('Convex scripts and packages remain declared', async () => {
      const pkg = JSON.parse(await readFile('package.json', 'utf8'));
      assert.equal(pkg.scripts['convex:check'], 'CONVEX_AGENT_MODE=anonymous convex dev --once');
      for (const name of [
        'convex',
        '@convex-dev/better-auth',
        'better-auth',
        'convex-helpers',
        '@convex-dev/rate-limiter',
        '@convex-dev/workflow',
        '@convex-dev/workpool',
      ]) assert.ok(pkg.dependencies[name], name + ' is required');
    });

- [ ] **Step 2: Confirm it fails**

Run: npm run test:unit -- tests/unit/convex-release-config.test.ts

Expected: failure because dependencies and scripts are absent.

- [ ] **Step 3: Install pinned dependencies**

Run: npm install convex@latest @convex-dev/better-auth better-auth@~1.6.15 convex-helpers @convex-dev/rate-limiter @convex-dev/workflow @convex-dev/workpool

Add scripts:

    "convex:dev": "convex dev",
    "convex:codegen": "convex codegen",
    "convex:check": "CONVEX_AGENT_MODE=anonymous convex dev --once"

Add .auth-keys.json, .convex/, and tmp/convex-migration/ to .gitignore.

- [ ] **Step 4: Add convex.json**

    {
      "$schema": "./node_modules/convex/schemas/convex.schema.json",
      "functions": "convex/"
    }

- [ ] **Step 5: Verify and commit**

Run the targeted test. Commit: build: establish convex migration toolchain

---

### Task 2: Define schema, validators, public IDs, and indexes

**Files:**
- Create: convex/convex.config.ts
- Create: convex/validators.ts
- Create: convex/schema.ts
- Create: convex/lib/publicIds.ts
- Test: tests/unit/convex-schema-contract.test.ts

**Interfaces:**
- Produces newPublicId(), validators, all application tables, by_public_id indexes, and tenant indexes.

- [ ] **Step 1: Write failing schema tests**

    test('externally addressable tables have public ID indexes', async () => {
      const source = await readFile('convex/schema.ts', 'utf8');
      for (const table of ['organizations', 'users', 'workspaces', 'products', 'scans', 'actions', 'publicScans', 'apiKeys']) {
        assert.match(source, new RegExp(table + '[\\\\s\\\\S]*by_public_id'));
      }
    });

Also assert by_organization_id_and_user_id, by_workspace_id_and_created_at, by_provider_and_event_id, and by_key_hash.

- [ ] **Step 2: Register components**

    import { defineApp } from 'convex/server';
    import betterAuth from '@convex-dev/better-auth/convex.config';
    import rateLimiter from '@convex-dev/rate-limiter/convex.config';
    import workflow from '@convex-dev/workflow/convex.config';
    import workpool from '@convex-dev/workpool/convex.config';

    const app = defineApp();
    app.use(betterAuth);
    app.use(rateLimiter);
    app.use(workflow);
    app.use(workpool);
    export default app;

- [ ] **Step 3: Add strict validators**

Define literal unions for roles, plans, providers, measurement states, citation provenance, action states, priorities, and job states. Define complete citation, confidence, sample, failure, and billing validators. Use v.any() only for bounded settings, metadata, and raw provider evidence validated before storage.

- [ ] **Step 4: Define every application table**

Create all tables from the spec. Use Convex IDs internally, UUID publicId strings externally, and millisecond timestamps. For example:

    const workspaces = defineTable({
      publicId: v.string(),
      organizationId: v.id('organizations'),
      name: v.string(),
      logoUrl: v.union(v.string(), v.null()),
      settings: v.any(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index('by_public_id', ['publicId'])
      .index('by_organization_id', ['organizationId']);

Every read path gets an index. Do not use unbounded collect.

- [ ] **Step 5: Generate and verify**

Run the schema tests, npm run convex:codegen, and npm run typecheck.

Commit: feat: define convex data model

---

### Task 3: Move authentication and tenant authorization

**Files:**
- Create: convex/auth.config.ts
- Create: convex/auth.ts
- Create: convex/http.ts
- Create: convex/lib/tenant.ts
- Create: convex/users.ts
- Create: convex/organizations.ts
- Create: convex/workspaces.ts
- Create: lib/auth-client.ts
- Create: lib/auth-server.ts
- Create: app/ConvexClientProvider.tsx
- Create: app/api/auth/[...all]/route.ts
- Modify: app/layout.tsx
- Test: tests/integration/convex-tenant-auth.test.ts

**Interfaces:**
- Produces requireIdentity, requireMembership, requireWorkspace, requireRole, getToken, fetchAuthQuery, fetchAuthMutation, and fetchAuthAction.

- [ ] **Step 1: Write tenant boundary tests**

Cover unauthenticated denial, viewer read access, viewer write denial, editor content writes, admin workspace management, owner billing access, and cross-organization denial.

- [ ] **Step 2: Configure Better Auth**

Enable verified email/password and Google OAuth. Register Better Auth routes in convex/http.ts and the issuer in convex/auth.config.ts.

- [ ] **Step 3: Implement custom tenant wrappers**

Use convex-helpers custom functions. Inject:

    type TenantContext = {
      userId: Id<'users'>;
      organizationId: Id<'organizations'>;
      membershipId: Id<'memberships'>;
      role: 'owner' | 'admin' | 'editor' | 'viewer';
    };

Resolve identity by token identifier, membership through an index, and workspace through publicId plus organization ownership.

- [ ] **Step 4: Provision users transactionally**

Create user, organization, owner membership, and My Brand workspace in one mutation. If a verified email matches an imported unclaimed user, attach the auth identity without creating a second tenant.

- [ ] **Step 5: Wire Next.js**

Proxy /api/auth to Convex Better Auth, expose authenticated server helpers, wrap the app in ConvexClientProvider, and keep security headers.

- [ ] **Step 6: Create dev auth secrets safely**

Generate temporary RS256 keys, set them only on the isolated development deployment, and delete the temporary file. Do not print or commit secrets.

- [ ] **Step 7: Verify**

Run tenant tests, type-check, and a browser sign-up → sign-in → dashboard round trip.

Commit: feat: move identity and tenant authorization to convex

---

### Task 4: Build idempotent export, import, and parity tooling

**Files:**
- Create: scripts/convex/export-supabase.ts
- Create: scripts/convex/import-convex.ts
- Create: scripts/convex/check-parity.ts
- Create: convex/imports.ts
- Test: tests/unit/convex-import-transform.test.ts
- Test: tests/integration/convex-import-contract.test.ts

**Interfaces:**
- Produces versioned JSONL, manifest.json, imports:upsertBatch, and imports:paritySummary.

- [ ] **Step 1: Write synthetic conversion tests**

Use two organizations, multiple roles/workspaces, scans, actions, API keys, and billing events. Verify timestamps, nulls, arrays, citations, foreign keys, and public IDs.

- [ ] **Step 2: Implement the read-only exporter**

Require an explicit connection environment variable and output directory. Refuse a production target without --allow-production-export. Use ordered pagination, JSONL, SHA-256 hashes, and counts. Never print row bodies or credentials.

- [ ] **Step 3: Implement bounded import mutations**

Accept at most 200 records per call. Validate fields, upsert by publicId, resolve parents by indexes, and record import progress. Replays must not duplicate rows.

- [ ] **Step 4: Implement import order**

Import tenant parents, configuration, scans/evidence, actions/events, API keys/quotas, billing, jobs/digests/notifications, then public/marketing records. Stop at the first unmatched foreign key.

- [ ] **Step 5: Implement parity checks**

Compare counts and non-sensitive aggregates only: memberships, scans/successes/failures, billing event keys, active/revoked keys, action event counts, and mention counts.

- [ ] **Step 6: Verify synthetic round-trip**

Run export, import, parity, and the same import again. Confirm zero duplicates.

Commit: feat: add resumable convex data migration

---

### Task 5: Move core product data

**Files:**
- Create: convex/products.ts
- Create: convex/prompts.ts
- Create: convex/forum.ts
- Create: convex/content.ts
- Create: convex/analytics.ts
- Create: convex/attribution.ts
- Modify: matching dashboard pages and Next.js routes
- Test: tests/integration/convex-product-access.test.ts

**Interfaces:**
- Produces paginated queries and role-checked mutations for products, prompts, forum opportunities, content analyses, experiments, and attribution.

- [ ] **Step 1: Write role and pagination tests**

Assert viewer reads, editor writes, cross-workspace denial, bounded pagination, and stable public IDs.

- [ ] **Step 2: Implement domain functions**

Use public functions only for direct browser calls. Keep crawler and derived writes internal. Every list uses paginationOptsValidator; every lookup uses by_public_id and tenant verification.

- [ ] **Step 3: Convert Route Handlers**

Replace Supabase with fetchAuthQuery/fetchAuthMutation/fetchAuthAction. Keep request validation and response shapes unchanged.

- [ ] **Step 4: Convert dashboard reads**

Use one preloaded authenticated query per server page or a reactive client query. Do not keep parallel REST and useQuery sources for the same state.

- [ ] **Step 5: Verify and commit**

Commit: feat: move core product data to convex

---

### Task 6: Move measurement and citations to durable workflows

**Files:**
- Create: convex/scans.ts
- Create: convex/measurementActions.ts
- Create: convex/measurementWorkflow.ts
- Create: convex/citations.ts
- Modify: lib/ai/llm-scanner.ts
- Modify: lib/ai/citation-provenance.ts
- Modify: lib/measurement/types.ts
- Modify: lib/measurement/comparison.ts
- Test: tests/unit/provider-request-contract.test.ts
- Test: tests/integration/convex-measurement-workflow.test.ts

**Interfaces:**
- Produces measurementWorkflow.start, scans.getRun, scans.listWorkspace, and canonical receipts.

- [ ] **Step 1: Write provider-request tests**

Require Gemini search grounding, OpenAI web search where available, Claude web search, supported Perplexity Sonar, and recorded answer model/search mode.

- [ ] **Step 2: Extend compatibility metadata**

Add searchMode, analyzerMethod, analyzerModel, and analyzerPromptVersion. Increment measurement contract/scorer versions and include the fields in comparison keys.

- [ ] **Step 3: Keep scoring pure**

Brand matching, Wilson calculations, aggregation, and comparison remain pure TypeScript. Provider calls run in Node actions and return explicit success/failure values.

- [ ] **Step 4: Implement the workflow**

Reserve quota transactionally, create a run, enqueue bounded engine/sample work, persist idempotently, finalize only after expected work settles, and evaluate alerts only after persistence.

- [ ] **Step 5: Enforce citation provenance**

Only structured fields from enabled search tools become provider_citation. Generated prose URLs remain link_mentioned. Invalid/private URLs remain unverified.

- [ ] **Step 6: Verify recovery**

Test complete, partial, all-failed, timeout, replay, and simulated crash recovery. A persistence failure cannot report complete.

Commit: feat: run measurements durably on convex

---

### Task 7: Preserve API keys, /api/v1, and MCP

**Files:**
- Create: convex/apiKeys.ts
- Create: convex/apiV1.ts
- Create: lib/convex/server.ts
- Create: lib/convex/compat.ts
- Modify: lib/api-auth.ts
- Modify: lib/api-v1.ts
- Modify: all app/api/v1 route files
- Test: tests/integration/convex-api-v1-contract.test.ts
- Test: MCP client fixtures

**Interfaces:**
- Produces bearer-key resolution, scopes, shared limits, and unchanged JSON/HTTP contracts.

- [ ] **Step 1: Capture current contracts**

Cover invalid/revoked keys, read/measure scopes, changed membership, workspace mismatch, idempotency reuse, quotas, rate limits, partial scans, and all-engine failure.

- [ ] **Step 2: Implement key resolution**

Hash the presented alo_live_* secret in Next.js, look up by key_hash, verify creator membership/workspace ownership, and stamp lastUsedAt asynchronously.

- [ ] **Step 3: Implement shared rate and quota state**

Use the rate-limiter component for minute buckets and transactional quota reservations for weekly plan limits and idempotency.

- [ ] **Step 4: Convert adapters**

Keep paths and response shapes. Start durable measurements and preserve current synchronous receipt behavior within the route budget.

- [ ] **Step 5: Verify API and MCP**

Run integration tests, MCP type-check, and MCP fixtures against the local compatibility server.

Commit: feat: preserve api and mcp on convex

---

### Task 8: Move billing authority

**Files:**
- Create: convex/billing.ts
- Create: convex/billingActions.ts
- Modify: Stripe and Razorpay checkout, verify, and webhook routes
- Test: tests/integration/convex-billing-contract.test.ts

**Interfaces:**
- Produces billing.applyVerifiedEvent and billing.getOrganizationState.

- [ ] **Step 1: Port billing safety tests**

Verify signatures before mutation; server-owned plan/price/amount/currency mapping; provider object re-fetch; provider/event uniqueness; stale-event protection; and one atomic ledger+plan mutation.

- [ ] **Step 2: Implement transactional billing mutation**

Accept only normalized, already-verified internal input. Re-check uniqueness and organization, compare occurredAt, insert the immutable event, and update plan/subscription atomically.

- [ ] **Step 3: Preserve stable webhook URLs**

Verify raw signatures in current Next.js routes before calling internal Convex functions. Never expose a billing mutation publicly.

- [ ] **Step 4: Verify replay and ordering**

Test duplicates, out-of-order events, wrong amounts/currencies, unknown prices, cancellations, and Convex failures.

Commit: feat: move billing state to convex

---

### Task 9: Move actions, alerts, jobs, email, crawlers, and public flows

**Files:**
- Create: convex/actions.ts
- Create: convex/alerts.ts
- Create: convex/digests.ts
- Create: convex/crons.ts
- Create: convex/crawlers.ts
- Create: convex/publicScans.ts
- Create: convex/newsletter.ts
- Modify: related Next.js routes and callers
- Test: tests/integration/convex-background-work.test.ts

**Interfaces:**
- Produces atomic action history, deduplicated notifications/digests, scheduled work, crawler actions, public receipts, and subscriptions.

- [ ] **Step 1: Write atomicity/replay tests**

Cover action+event transactions, duplicate insight keys, digest week claims, notification dedupe, scheduled retries, public scan weekly limits, and newsletter resubscription.

- [ ] **Step 2: Implement transactional mutations**

Action state and audit event share one mutation. Digest/notification dedupe uses indexes. Jobs record attempts, next attempt, error class, and terminal state.

- [ ] **Step 3: Move external calls to actions**

Resend, crawlers, forum discovery, and public Gemini scans run in Node actions and persist through internal mutations with timeouts and bounded concurrency.

- [ ] **Step 4: Add crons**

Schedule due scans, workflow recovery, sentiment drift, and weekly digest. Cron handlers enqueue bounded work and return quickly.

- [ ] **Step 5: Verify and commit**

Commit: feat: move background workflows to convex

---

### Task 10: Remove Supabase runtime

**Files:**
- Delete: lib/supabase/admin.ts
- Delete: lib/supabase/client.ts
- Delete: lib/supabase/server.ts
- Delete: lib/supabase/middleware.ts
- Modify: proxy.ts
- Modify: auth pages and callback
- Modify: every remaining caller from the inventory
- Modify: package.json and package-lock.json
- Test: tests/integration/no-supabase-runtime.test.ts

**Interfaces:**
- Produces zero production runtime dependency on Supabase.

- [ ] **Step 1: Write the failing source scan**

    test('production source has no Supabase runtime dependency', async () => {
      for (const file of await sourceFiles(['app', 'components', 'hooks', 'lib', 'mcp-server/src'])) {
        const source = await readFile(file, 'utf8');
        assert.doesNotMatch(source, /@supabase|lib\\/supabase|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE_KEY/, file);
      }
    });

- [ ] **Step 2: Convert all remaining callers**

Re-run the inventory. Replace use-realtime with Convex reactive queries or remove it if unused. Replace Supabase middleware with Better Auth protection while preserving headers and production bypass rejection.

- [ ] **Step 3: Remove packages and env declarations**

Run: npm uninstall @supabase/ssr @supabase/supabase-js

Keep pg only as a development dependency until production migration and rollback close.

- [ ] **Step 4: Verify**

Run npm test and confirm the source scan finds zero production references.

Commit: refactor: remove supabase runtime

---

### Task 11: Full isolated-deployment verification

**Files:**
- Create: docs/product-rescue/CONVEX_CUTOVER_AND_ROLLBACK.md
- Modify: docs/product-rescue/IMPLEMENTATION_PROGRESS.md
- Modify: docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md

- [ ] **Step 1: Push the isolated Convex deployment**

Run: npm run convex:check

Expected: schema and functions push cleanly.

- [ ] **Step 2: Run all gates**

Run, in order:

    npm test
    npm run lint
    npm run typecheck
    npm run typecheck:mcp
    npm run build -- --webpack
    git diff --check

Fix root causes; do not disable rules.

- [ ] **Step 3: Run browser journeys**

At 390, 768, 1024, and 1440 widths: sign-up, sign-in, onboarding, workspace switching, prompt editing, scan, partial failure, sources, action history, reports/settings, API keys, and sign-out. Inspect console/network and keyboard focus.

- [ ] **Step 4: Run security and compatibility checks**

Verify all roles, cross-tenant denial, 401/403/409/429, API scopes, public scan limits, billing replay, scheduled retry, and MCP reads.

- [ ] **Step 5: Run synthetic import parity**

Import twice and confirm no duplicates or aggregate drift.

- [ ] **Step 6: Document cutover and rollback**

Record environment names, maintenance order, export/import/parity commands, auth re-claim behavior, webhook order, smoke tests, rollback triggers, and the Supabase read-only rollback window.

- [ ] **Step 7: Review and commit**

Review git status and every diff. Preserve .agents/ and skills-lock.json.

Commit: docs: prepare convex cutover and rollback

---

### Task 12: Production cutover — explicit approval required

- [ ] **Step 1: Verify exact targets and approval**

Record the Supabase production project, Convex production deployment, Vercel project, provider modes, and maintenance window. Stop if ambiguous.

- [ ] **Step 2: Create recoverable exports**

Export auth/application data and preserve billing/API-key ledgers. Encrypt artifacts outside git and record hashes/counts.

- [ ] **Step 3: Import under maintenance mode**

Run the approved import, parity checks, tenant checks, and metric comparisons before enabling writes.

- [ ] **Step 4: Switch one writer at a time**

Switch Next.js data configuration, auth, webhooks, then crons. Never let Supabase and Convex both apply billing or scheduled writes.

- [ ] **Step 5: Smoke-test and monitor**

Use authorized test accounts. Monitor auth, workflows, provider latency, quotas, billing retries, digests, and tenant denials.

- [ ] **Step 6: Retain rollback state**

Keep Supabase read-only plus the previous immutable deployment and encrypted exports for the documented rollback window. Deletion requires a separate explicit request.

