# Aelo Product Rescue — Implementation Progress

## Initial state

- **Recorded:** 2026-08-29 Asia/Kolkata
- **Initial branch:** `main`
- **Initial commit:** `e206b75a7d1569a536aafb823c8e94f52bd1637c`
- **Implementation branch:** `codex/product-rescue`
- **Initial working tree:** untracked `.agents/`, `docs/`, and `skills-lock.json`
- **Ownership note:** `.agents/` and `skills-lock.json` came from the previously requested skill installation. They are preserved and excluded from rescue commits unless explicitly needed. `docs/product-rescue/00`–`07` are the approved audit inputs.
- **Production data:** untouched
- **Deployment:** not authorized and not attempted

## Batch 0 — Baseline and plan

### Problem addressed

The rescue requires a recorded starting point, a dedicated branch, a reviewable plan, and an honest account of existing environmental failures before functional changes.

### User impact

No product behavior changes. This protects traceability and prevents unrelated/untracked files from entering rescue commits.

### Files changed

- `docs/product-rescue/IMPLEMENTATION_PLAN.md`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

None.

### Commands run and results

- `git branch --show-current` → `main`
- `git rev-parse HEAD` → `e206b75a7d1569a536aafb823c8e94f52bd1637c`
- `git status --short` → untracked `.agents/`, `docs/`, `skills-lock.json`
- `git switch -c codex/product-rescue` → succeeded
- `node --version` → `v22.23.1`
- `npm --version` → `10.9.8`
- `df -h .` → data volume 99% full with about 1.9 GiB available
- implementation-plan placeholder scan → no prohibited placeholders found

### Evidence

Audit evidence is recorded in `docs/product-rescue/00-executive-summary.md` through `07-open-questions-and-assumptions.md`.

### Migration considerations

None in Batch 0.

### Remaining risks

All confirmed P0/P1 issues remain until their implementation batches complete. Local disk and dependency integrity previously blocked full verification.

### Commit hash

`1012d9b` — `docs: record product rescue baseline and plan`

## Batch 1A — Verification gates

### Problem addressed

The repository referenced ESLint but did not declare its packages, had no explicit type/test scripts, mixed the nested MCP package into the root type-check, and allowed production builds to ignore TypeScript errors.

### User impact

No customer-facing behavior changes. Future security and journey fixes now have explicit, non-bypassable verification commands.

### Files changed

- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tsconfig.json`
- `tests/unit/release-config.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- Production build cannot set `ignoreBuildErrors: true`.
- Required lint/app-type/MCP-type scripts remain declared.

### Commands run and results

- Removed generated `.next` cache (992 MB); source and user data were not affected.
- `npm install` → restored existing root dependencies; reported 8 dependency advisories (3 moderate, 5 high). No automatic audit fix was run.
- `npm install --prefix mcp-server` → restored MCP dependencies; 0 advisories reported for that package.
- Added missing development tooling `eslint@^9` and `eslint-config-next@16.2.9`, matching the installed Next 16.2.9 line.
- `npm run test:unit` → 2 passed after approved local IPC access; sandbox-only first attempt failed with `listen EPERM`.
- `npm run typecheck:mcp` → passed.
- `npm run typecheck` → failed with 9 existing errors in scanner, alerts, and data-access code.
- `npm run lint -- --quiet` → tool now runs against Aelo application/test sources and reports 87 existing errors.

### Evidence

Command output in the implementation task; regression test at `tests/unit/release-config.test.ts`.

### Migration considerations

None.

### Remaining risks

- App lint and type-check do not yet pass; they are now visible and blocking rather than silently skipped.
- Root dependency audit reports 5 high and 3 moderate advisories; each needs package-by-package review rather than an unsafe blanket update.
- Disk remains constrained; generated caches must be managed during verification.

### Commit hash

`351542f` — `build: establish rescue verification gates`

## Batch 1B — Tenant identity and billing-field lock

### Problem addressed

RLS limited which user/organization row could be updated but did not limit columns. An authenticated user could therefore attempt to change their tenant, role, super-admin flag, or organization plan/payment identifiers directly.

### User impact

Tenant membership, privileges, and paid entitlements become server-owned. Existing profile-name, avatar, onboarding-completion, and organization-name updates remain allowed.

### Files changed

- `supabase/migrations/025_lock_sensitive_identity_and_billing_fields.sql`
- `tests/integration/rls-sensitive-fields.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- Authenticated user updates are limited to `full_name`, `avatar_url`, and `onboarding_completed`.
- Authenticated organization updates are limited to `name`.
- Future broad grants are caught by defense-in-depth triggers.
- Update policies constrain both old and new rows.

### Commands run and results

- `npm run test:integration` before migration → 4 expected failures because migration `025` did not exist.
- `npm run test:integration` after migration → 4 passed.
- `npm test` → 6 passed across all current unit/integration tests.
- targeted ESLint on the TypeScript regression test → passed; SQL was ignored because ESLint has no SQL parser.
- `npm run typecheck` → still fails only on the 9 previously recorded scanner/alerts/data-access errors.
- `npx next build --webpack` → application compiled, then Next’s type worker failed with `invalid type: unit value, expected usize`; native SWC remains unavailable. Generated 651 MB cache was removed afterward.

### Evidence

- Static migration-contract regression tests are passing.
- No `supabase` CLI or Docker runtime is installed, so the migration was not executed against a disposable database in this environment.

### Migration considerations

- Apply after migration 024.
- Before applying, run the read-only audit queries included at the end of migration 025 and investigate unexpected privileged/paid rows.
- The migration uses column grants, explicit `WITH CHECK` policies, and triggers. Service-role writes remain permitted.
- Preferred rollback is correcting an omitted safe allowlist column. Restoring broad table UPDATE grants reopens the vulnerability and is not a safe rollback.

### Remaining risks

- Database behavior must still be verified in a clean Supabase test project and an upgraded staging copy.
- Billing webhooks still need fail-closed provider validation and idempotency.

### Commit hash

`3a952b4` — `security: lock tenant and billing fields`

## Batch 1C — Verified, duplicate-safe billing events

### Problem addressed

Razorpay webhooks could process unsigned payloads, trusted plan data carried in the event, and applied repeated events directly. Stripe mapped client metadata to plans, used a cookie-scoped database client in the webhook, ignored database update failures, and had placeholder price IDs that could reach checkout.

### User impact

Paid access changes only after a signed provider event is checked against provider-owned payment, order, subscription, amount, currency, and price data. Replayed events are recorded once and cannot apply the same upgrade twice. Older Stripe events cannot overwrite newer billing state.

### Files changed

- `app/api/razorpay/create-order/route.ts`
- `app/api/razorpay/verify/route.ts`
- `app/api/webhooks/razorpay/route.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `lib/billing/plans.ts`
- `lib/billing/razorpay.ts`
- `lib/billing/webhook-events.ts`
- `supabase/migrations/026_create_billing_webhook_events.sql`
- `tests/unit/billing-plans.test.ts`
- `tests/unit/billing-razorpay.test.ts`
- `tests/integration/billing-route-contract.test.ts`
- `tests/integration/billing-webhook-migration.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- Razorpay signatures fail closed when their secret/signature is missing or invalid.
- Razorpay payments must be captured and match the provider-fetched paid order, server-owned plan, exact amount, currency, and organization.
- Stripe price IDs map through configured server-owned allowlists; missing and placeholder prices fail closed.
- Billing event storage has a provider/event uniqueness key, atomic plan application, restricted function access, and stale-event protection.
- Webhook routes retain provider retrieval, service-role access, and the shared atomic event function; direct plan updates and Razorpay fallback plans are rejected by regression checks.

### Commands run and results

- Initial billing tests before implementation → expected failures because the billing modules and migration did not exist.
- `npm test` after implementation → 14 passed; sandbox-only first attempt failed with `listen EPERM`, then passed with approved local IPC access.
- targeted ESLint for all changed TypeScript routes/modules/tests → passed.
- `npm run typecheck:mcp` → passed.
- `npm run typecheck` → still fails only on the same 9 recorded scanner/alerts/data-access errors; no billing files fail.
- `npm run build -- --webpack` → application bundle compiled successfully, then Next's TypeScript worker failed with the existing WASM fallback error `invalid type: unit value, expected usize` because native SWC is unavailable.
- `git diff --check` → passed before the progress update.
- Removed the newly generated 651 MB `.next` build cache after the failed build; source and user data were not affected.

### Evidence

- Fourteen automated unit/integration contract tests pass.
- Provider signatures and authoritative object retrieval are explicit in both webhook paths.
- Plan changes are centralized in the `apply_billing_event` database transaction instead of route-level updates.
- No live provider checkout or webhook was attempted because test provider credentials and a disposable deployed endpoint are not available in this environment.

### Migration considerations

- Apply after migrations 024 and 025.
- Migration 026 creates a private billing-event audit ledger and a service-role-only atomic function. It does not rewrite existing organization plans.
- Configure real Stripe price IDs and both webhook secrets before enabling traffic; checkout now returns 503 instead of using placeholder price IDs.
- Verify signed Stripe and Razorpay test-mode events in staging, including duplicates and deliberately out-of-order Stripe events, before production rollout.
- Keep the event ledger during rollback so provider retries cannot lose their audit/idempotency history. Disable webhook delivery before removing the function.

### Remaining risks

- Migration 026 still needs execution against a clean Supabase test project and upgraded staging database.
- Real provider SDK responses and webhook retries need test-mode staging verification.
- Stripe events created in the same one-second timestamp bucket do not have a stronger provider sequence number; exact duplicates are safe, while two distinct same-second lifecycle events follow delivery order.
- The application-wide type/build failures remain release blockers outside this billing batch.

### Commit hash

`8c8f53e` — `security: verify and deduplicate billing events`

## Batch 1D — Exact brand matching and citation provenance

### Problem addressed

The analyzer generated single-character deletion variants and used substring matching, so `Aelo` could match ordinary `AEO`. Own-domain detection also used a substring. Separately, URLs extracted from ordinary generated prose were stored and displayed as citations even when the provider supplied no grounded source evidence.

### User impact

Visibility scores no longer count known deletion/subword false positives. Citation receipts now distinguish provider-backed citations, links merely mentioned in an answer, and unverified references. Source aggregates include only provider-backed evidence, while legacy citation keys remain readable.

### Files changed

- `lib/ai/brand-matching.ts`
- `lib/ai/citation-provenance.ts`
- `lib/ai/ai-analyzer.ts`
- `lib/ai/llm-scanner.ts`
- `lib/types.ts`
- `app/api/v1/scan/route.ts`
- `app/api/v1/citations/route.ts`
- `app/api/v1/citations/sources/route.ts`
- `app/api/analytics/citations/route.ts`
- `app/api/forum/citation-map/route.ts`
- `components/dashboard/scan-receipt-drawer.tsx`
- `app/(dashboard)/dashboard/llm-tracker/page.tsx`
- `app/(marketing)/scan/[id]/page.tsx`
- `tests/unit/brand-matching.test.ts`
- `tests/unit/citation-provenance.test.ts`
- `tests/integration/measurement-truth-contract.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- Versioned golden corpus for Aelo/AEO, deletion/subword cases, configured aliases, case, punctuation, possessive/plural, hyphen/whitespace, Unicode, and short brands.
- URL/hostname normalization including exact/subdomain boundaries and IDN punycode behavior.
- Provider-native, prose-only, duplicate, invalid-scheme, loopback, metadata, and IPv6 link-local citation fixtures.
- Structured Perplexity and Gemini citation extraction fixtures.
- Route/display contract assertions requiring provider-only source aggregation and visible evidence labels.

### Commands run and results

- Focused tests before implementation → 2 expected module-not-found failures.
- `npm test` after implementation → 25 passed.
- targeted ESLint across all changed TypeScript/TSX files → passed with no warnings.
- `npm run typecheck:mcp` → passed.
- `npm run typecheck` → 8 existing errors remain in alerts/data-access; the scanner error was fixed, reducing the baseline from 9.
- `npm run lint -- --quiet` → 78 existing repository errors remain, down from the recorded 87; changed files are clean.
- `npm run build -- --webpack` → blocked by `ENOSPC` while writing the webpack cache. The 250 MB generated `.next` cache was removed; no source or user data was affected.
- `git diff --check` → passed before the final review.

### Browser evidence

- Local Aelo verified at `http://localhost:3001` using webpack because native SWC/Turbopack is unavailable.
- Desktop public page title and content matched Aelo; no console warnings/errors.
- At 390×844, Menu and Start free were present, no horizontal overflow, and no console warnings/errors.
- Authenticated tracker correctly redirected to `/login`. No test login was supplied. A request to enable the local developer bypass was rejected by the safety reviewer, so authenticated receipt labels were not browser-tested or bypassed. Their rendering is covered by the passing regression contract.

### Evidence

- `BRAND_MATCHING_CORPUS_VERSION` records the scorer corpus version.
- New citation JSON keeps `url`, `title`, and `is_own_domain`, then adds provenance, provider, sample ID, raw provider reference, and fetch-validation state.
- Plain response URLs are `link_mentioned`; only structured provider references become `provider_citation`.
- Invalid/private references are never fetched and are rendered as non-clickable unverified text in updated receipt views.

### Migration considerations

No schema migration is required because `llm_scans.citations` is JSONB and new fields are additive. Existing rows without provenance are treated as `unverified`; they are excluded from provider-source aggregates but remain visible in receipts and API history.

### Remaining risks

- Existing rows cannot be retroactively promoted to provider citations because their raw provider evidence was not stored.
- Authenticated receipt UI needs desktop/mobile browser verification with an authorized test login.
- Current Gemini calls do not enable a search/grounding tool, so they may legitimately return no provider-backed citations even if prose mentions URLs.
- URL validation is intentionally non-fetching. DNS/redirect validation belongs in the later SSRF-safe fetch batch.
- The disk has only about 1.1 GiB free after cache cleanup and continues to block production builds.
- Eight app type errors and 78 app lint errors remain release blockers.

### Commit hash

`298f531` — `fix: make measurement evidence honest`

## Batch 1E — API authorization, quota, and dangerous-route removal

### Problem addressed

An unauthenticated GET route could delete and recreate a fixed test user with the service role. API scans required only read scope, loaded entitlements through cookie auth, did not reserve weekly quota atomically, and hid partial provider/persistence failures. API-key and workspace mutations used the service role without centralized owner/admin checks.

### User impact

The destructive route is absent. Measurement requires a `measure`-scoped API key whose user and workspace are revalidated against its organization. Free-plan weekly runs reserve atomically, duplicate request keys stop before provider calls, partial engine failures are explicit, and only owners/admins can manage API keys or create brand workspaces.

### Files changed

- deleted `app/api/setup-test-user/route.ts`
- `lib/authorization.ts`
- `lib/api-auth.ts`
- `lib/api-v1.ts`
- `lib/entitlements.ts`
- `lib/data-access.ts`
- `lib/alerts/evaluate.ts`
- `app/api/v1/scan/route.ts`
- `app/api/keys/route.ts`
- `app/api/keys/[id]/route.ts`
- `app/api/workspaces/route.ts`
- `supabase/migrations/027_create_scan_quota_reservations.sql`
- `tests/integration/api-auth-boundaries.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- Production source tree excludes `/api/setup-test-user`.
- API-key resolution revalidates both workspace→organization and creator→organization bindings and carries current role.
- Scan route requires `measure`, reserves quota, reports requested/succeeded/failed engines and persistence state, and rejects duplicate request keys.
- Service-role API-key/workspace mutations require owner/admin.
- Quota migration has an organization row lock, trailing-seven-day count, unique request identity, explicit reserved/duplicate/denied outcomes, and service-role-only execution.

### Commands run and results

- Focused tests before implementation → 5 expected failures.
- `npm test` after implementation → 30 passed.
- targeted ESLint across all changed TypeScript routes/modules/tests → passed.
- `npm run typecheck` → passed. This batch also fixed the 8 pre-existing scanner/alerts/data-access failures recorded at baseline.
- `npm run typecheck:mcp` → passed.
- `npm run lint -- --quiet` → 76 existing repository errors remain, down from 87 at baseline; changed files are clean.
- `npm run build -- --webpack` → passed: compiled, TypeScript passed, 133 static pages generated, traces collected, and the final route manifest excluded `/api/setup-test-user`.
- Removed the 660 MB successful-build `.next` cache afterward; source and user data were not affected.

### Browser/runtime evidence

- `http://localhost:3001/api/setup-test-user` rendered Aelo's 404 page with no console warnings/errors.
- An unauthenticated POST to `/api/v1/scan` returned HTTP 401 with `Invalid or missing API key`; the server log showed no provider request.
- Authenticated 403/429/partial-result runtime checks require a disposable migrated database and test API keys, which are not available locally.

### Migration considerations

- Apply migration 027 after 024–026.
- The reservation table is additive and does not rewrite scans or plans.
- Apply 027 before deploying the updated scan/workspace routes; without the RPC, measurement fails closed instead of running unmetered.
- Keep reservations during rollback as an audit record. Revoke service-role function execution before disabling the route caller.
- Verify three allowed free runs, the fourth denied run, concurrent reservations, duplicate request rejection, and paid-plan behavior in staging.

### Remaining risks

- Migration 027 has static contract coverage only; Supabase CLI/Docker is still unavailable for a disposable database run.
- API-key 403 and quota 429 runtime fixtures still need authorized test keys after migration.
- A quota reservation is intentionally consumed once provider work begins, including an all-provider-failed run; product/support policy for refunds is not yet defined.
- Full repository lint still fails with 76 pre-existing errors even though type-check, tests, and build pass.
- The in-memory per-instance minute limiter remains until the later Upstash reliability batch.

### Commit hash

`71709ff` — `security: enforce API authorization and quotas`

## Batch 1F — Scheduled-scan claims and engine resolution

### Problem addressed

The API saved recurring scans with an empty engine list, so they could run without producing evidence. The cron selected due rows without a lock, allowing concurrent workers to run the same schedule, and a missing cron secret could be compared as the literal value `Bearer undefined`.

### User impact

New API schedules contain at least one configured engine allowed by the customer plan. Due schedules are leased in one database transaction, so concurrent cron workers skip work already claimed. Scheduled runs use the same atomic weekly quota reservation as manual measurement, and cron access fails closed when its secret is missing.

### Files changed

- `app/api/v1/scans/schedule/route.ts`
- `app/api/cron/process-scans/route.ts`
- `supabase/migrations/028_claim_scheduled_scans.sql`
- `tests/integration/scheduled-scan-contract.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- API schedules must resolve configured, entitled engines and may not write an empty list.
- The database claim uses `FOR UPDATE SKIP LOCKED`, an expiring lease, bounded batches, and service-role-only execution.
- The cron must reject missing configuration, consume the claim RPC, bind completion to the claim token, and use atomic scan quota reservation.

### Commands run and results

- Focused tests before implementation → 3 expected failures.
- `npm test` after implementation → 33 passed; the sandbox-only first attempt failed with `listen EPERM`, then passed with approved local IPC access.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint on all changed TypeScript files → passed.
- Full `npm run lint` → 74 existing errors and 83 warnings remain; changed files are clean.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 133 static pages, and build traces completed.
- `git diff --check` → passed before the progress update.
- Removed the generated `.next` cache after the successful build; source and user data were not affected.

### Migration considerations

- Apply migration 028 after 027 and before deploying the updated schedule routes.
- Existing empty-engine schedules are paused and labelled `invalid_no_platforms`; they are not silently assigned engines because their owners may have different plan/configuration state.
- The migration adds an enforced non-empty platform constraint, claim lease fields, a due-row index, and the service-role-only claim function.
- Claims expire after five minutes. Each handled run advances its schedule even on provider failure, preventing a broken provider from creating an immediate retry loop.
- Verify concurrent cron requests, lease expiry, quota denial, partial engine failure, and legacy empty-schedule pausing in a migrated staging database.

### Remaining risks

- Migration 028 has static contract coverage only because Supabase CLI/Docker is unavailable here.
- A worker crash after quota reservation but before completion can cause the stable run identity to be treated as a duplicate after lease expiry; staging should confirm the desired recovery policy before production.
- Shared rate limiting, SSRF-safe crawling, and protected analytics ingestion remain in the rest of the reliability batch.

### Commit hash

`8436873` — `fix: make scheduled scans single-run safe`

## Batch 1G — Shared production rate limiting

### Problem addressed

Request limits lived only in each server process, so traffic spread across serverless instances could bypass them. The old counter also rejected the final allowed request: a limit of three permitted only two.

### User impact

Production request limits now use one shared Upstash Redis counter across instances. If that shared protection is missing or unreachable, protected production routes return 503 instead of running unprotected. Local development keeps a clearly named `memory-local-only` fallback, and declared limits now allow exactly the stated number of requests.

### Files changed

- `lib/rate-limit.ts`
- `lib/api-v1.ts`
- `app/api/auth/signup/route.ts`
- `app/api/free-scan/route.ts`
- `app/api/prompts/discover/route.ts`
- `app/api/llm/scans/route.ts`
- `app/api/brand/enrich/route.ts`
- `tests/unit/rate-limit.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- Local boundary test permits exactly the configured number and rejects the next request.
- Production without shared Redis credentials fails closed.
- Source contract requires both existing Upstash packages and their standard environment variables.

### Commands run and results

- Focused tests before implementation → expected boundary and Upstash-wiring failures.
- `npm test` after implementation → 36 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across the limiter and every changed caller → passed. Four older `any` errors in touched scan routes were removed.
- Full `npm run lint` → 70 existing errors and 83 warnings remain, down from 74 errors before this sub-batch; changed files are clean.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 133 static pages, and traces completed.
- `git diff --check` → passed before the progress update.
- Removed the generated `.next` cache after the successful build; source and user data were not affected.

### Configuration and rollout

- Production now requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Configure both values before deploying this code. Partial or absent configuration fails protected requests closed with HTTP 503.
- Each route has a separate Redis namespace so signup, free scans, discovery, dashboard scans, enrichment, and API-key traffic do not consume one another's limits.
- No live Redis request was run because disposable Upstash credentials are not available in this environment. Verify allow/deny boundaries and a simulated Redis outage in staging.

### Remaining risks

- Client-IP parsing still relies on deployment-provided forwarding headers; the hosting layer must overwrite untrusted inbound forwarding values.
- SSRF-safe crawling and protected analytics ingestion remain in the reliability batch.
- Full repository lint still fails with 70 pre-existing errors.

### Commit hash

`022e1ce` — `fix: share production rate limits`

## Batch 1H — SSRF-safe website fetching

### Problem addressed

Crawler, audit, enrichment, and accuracy features fetched workspace/user URLs directly. A crafted URL or redirect could therefore reach loopback services, private networks, link-local cloud metadata, or an oversized response.

### User impact

Website checks now accept only credential-free HTTP(S) URLs on standard ports. Every initial host and redirect is resolved and rejected if any DNS answer is private or reserved, then the outbound connection is pinned to the validated address. Redirect count, headers, response bytes, compression, and request time are bounded.

### Files changed

- `lib/security/safe-fetch.ts`
- `lib/crawlers.ts`
- `lib/services/brand-enrichment.ts`
- `lib/ai/content-analyzer.ts`
- `lib/ai/claim-verifier.ts`
- `app/api/audit/help-center/route.ts`
- `app/api/audit/technical/route.ts`
- `tests/unit/safe-fetch.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- IPv4/IPv6 fixtures cover loopback, private, carrier-grade NAT, link-local metadata, multicast, reserved, mapped IPv4, and known public addresses.
- Unsafe literal URLs and URL credentials are rejected before a network request.
- Source contract requires DNS resolution, address pinning, manual redirect handling, and response-size enforcement.

### Commands run and results

- Focused tests before implementation → expected missing-module failure.
- `npm test` after implementation → 39 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across the shared helper and all six callers → passed. Five older lint errors in touched audit/content files were removed.
- Full `npm run lint` → 65 existing errors and 79 warnings remain, down from 70 errors before this sub-batch; changed files are clean.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 133 static pages, and traces completed.
- `git diff --check` → passed before the progress update.
- Removed the generated `.next` cache after the successful build; source and user data were not affected.

### Security behavior and rollout

- Redirects are followed manually up to three hops, with URL and DNS validation repeated at each hop.
- DNS answers are rejected as a set if any answer is non-public, reducing mixed public/private rebinding risk; the selected public address is used directly for the connection.
- Default limits are 8 seconds and 512 KB; HTML analysis callers opt into at most 10 seconds and 1 MB. Robots files use 256 KB.
- Compressed bodies are refused to avoid decompression bombs. Only ports 80 and 443 are accepted.
- No live external crawl was run in this environment. Verify representative customer sites, IPv6-only sites, redirects, large pages, and blocked metadata/private fixtures in staging.

### Remaining risks

- Sites that require non-standard ports or compressed-only responses now fail closed and may need a reviewed allowlist, not a blanket bypass.
- Analytics ingestion protection remains in the reliability batch.
- Full repository lint still fails with 65 pre-existing errors.

### Commit hash

`bcae09c` — `security: constrain outbound website fetches`

## Batch 1I — Signed, bounded analytics ingestion

### Problem addressed

The public analytics route accepted any workspace UUID and arbitrary JSON, trusted the caller's AI-source label, had no body/schema bounds, and inserted through the service role without authentication or rate limits.

### User impact

Pixel events now require a workspace-bound HMAC signature issued only through an authenticated install-token endpoint. Event names, UUIDs, referrers, paths, metadata depth/keys/bytes, and total request bytes are bounded. AI source is derived server-side from an exact referrer hostname, and both IP and signed-token traffic use the shared limiter.

### Files changed

- `lib/analytics-ingest.ts`
- `app/api/analytics/track/route.ts`
- `app/api/analytics/install-token/route.ts`
- `public/aelo-pixel.js`
- `components/dashboard/settings/install-tab.tsx`
- `app/(marketing)/docs/page.tsx`
- `tests/unit/analytics-ingest.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- A signed token validates only for its workspace and fails after workspace/token tampering.
- Event-schema fixtures cover exact referrer classification, invalid names, oversized paths, and oversized metadata.
- A streamed request over 16 KB stops with HTTP 413 semantics.
- Route contract requires signed verification, bounded parsing, shared rate limiting, and excludes unbounded `request.json()`.

### Commands run and results

- Focused tests before implementation → expected missing-module failure, then route-contract failure.
- `npm test` after implementation → 43 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across the ingest module/routes, install UI, docs, and tests → passed. One older client-effect lint error was removed.
- Full `npm run lint` → 64 existing errors and 79 warnings remain, down from 65 errors before this sub-batch; changed files are clean.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 134 static pages, traces, and the new `/api/analytics/install-token` route completed.
- `git diff --check` → passed before the progress update.
- Removed the generated `.next` cache after browser verification; source and user data were not affected.

### Browser/runtime evidence

- Local `/docs` rendered the signed `data-ingest-token` install attribute and signed request fields at 1280 px and 390 px.
- Desktop width was 1280 with 1274 px document width; mobile width was 390 with 384 px document width. No horizontal overflow or console warnings/errors were found.
- An unsigned local POST to `/api/analytics/track` returned HTTP 401.
- An unauthenticated local GET to `/api/analytics/install-token` returned HTTP 401.
- The authenticated Install tab could not be browser-tested because no authorized test login was supplied; no auth bypass was used.

### Configuration and rollout

- Generate a random `ANALYTICS_INGEST_SECRET` of at least 32 characters and configure the same value in every production/staging instance before deploying.
- Existing pixel snippets do not contain a signed token and will receive 401 after rollout. Customers must copy the refreshed snippet from Settings → Install; coordinate this as a breaking migration.
- The signing secret is currently absent locally, and the Install tab honestly reports that analytics signing is not configured.
- No database migration is required; the signature travels with the request and existing event rows remain readable.
- Verify a valid signed event, token/workspace mismatch, high-volume legitimate traffic, rate-limit boundaries, metadata rejection, and signing-secret rotation behavior in staging.

### Remaining risks

- A browser pixel token is necessarily public on the customer's site. It prevents workspace-ID guessing/forgery but can be copied and replayed; shared IP/token limits bound that abuse. Stronger replay resistance would require a server-side collector or per-page short-lived token exchange.
- Referrer attribution is derived rather than trusted as `ai_source`, but a non-browser client can still forge the referrer string. Treat pixel attribution as traffic evidence, not payment-grade proof.
- `ANALYTICS_INGEST_SECRET` and Upstash credentials are required before deployment; the code fails closed without them.
- Full repository lint still fails with 64 pre-existing errors.

### Commit hash

`8c5b3b3` — `security: protect analytics ingestion`

## Batch 2A — Canonical measurement contract and service

### Problem addressed

Multi-sample execution, aggregation, confidence labels, run status, and persistence state were calculated directly inside one API route. Confidence used an agreement heuristic that could label only four unanimous samples as high confidence, and persistence failure did not affect the run status.

### User impact

Every new API-key scan now includes a `measurement.v1` receipt with one run ID, requested engines/samples, every successful or failed sample, per-engine evidence, citations, a 95% Wilson confidence interval, persistence state, and an honest complete/partial/all-failed/untracked status. Existing response fields remain for API and MCP compatibility.

### Files changed

- `lib/measurement/types.ts`
- `lib/measurement/confidence.ts`
- `lib/measurement/service.ts`
- `app/api/v1/scan/route.ts`
- `tests/unit/measurement-confidence.test.ts`
- `tests/unit/measurement-service.test.ts`
- `tests/integration/api-auth-boundaries.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests added

- No evidence produces `none`; one sample is `low`; four unanimous samples remain `medium`; eight unanimous samples can become `high`.
- Invalid mention/sample counts fail rather than producing a misleading interval.
- Full, partial, all-provider-failed, and untracked run fixtures retain every engine/sample outcome.
- Persistence failure changes an otherwise successful run to `partial`.
- API contract requires the shared measurement service and contract version while preserving earlier authorization/quota fields.

### Commands run and results

- Focused tests before implementation → expected missing-module failures.
- `npm test` after implementation → 49 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across contract/service, API adapter, and tests → passed.
- Full `npm run lint` → the same 64 existing errors and 79 warnings remain; changed files are clean.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 134 static pages, and traces completed.
- `git diff --check` → passed before the progress update.
- Removed the generated `.next` cache after the successful build; source and user data were not affected.

### Compatibility and evidence

- Legacy `visibility`, `engines`, `requestedEngines`, `succeededEngines`, `failedEngines`, `failures`, `runStatus`, `persistence`, and `requestId` fields remain.
- New clients can prefer `contractVersion`, `runId`, and the nested canonical `measurement` receipt.
- Visibility is `null` inside the canonical contract when no engine succeeds, so provider outage is not represented as invisibility; the legacy field remains `0` for compatibility and is paired with `runStatus: all_failed`.
- No user-facing UI changed in this sub-batch. Authenticated runtime execution requires migrated quota tables and an authorized API key, unavailable here; provider/persistence states use deterministic injected fixtures instead of paid live calls.

### Remaining risks

- Onboarding, scheduled scans, dashboard summaries, interventions, and MCP descriptions still need adapters over this contract.
- The maximum eight samples can produce high confidence only when the interval is sufficiently narrow; this deliberately lowers some existing labels.
- The contract is additive JSON today; durable run/sample database tables and model-version capture may be needed in a later schema version.

### Commit hash

`3c8a935` — `feat: establish canonical measurement contract`

## Batch 2B — Honest intervention measurement

### Problem addressed

Intervention receipts compared one answer before an action with one answer after it. Different prompts or engines could be mixed, small samples could be called improved or regressed, and the follow-up scan bypassed the canonical measurement service and atomic quota.

### User impact

New intervention baselines keep up to eight recent samples per exact prompt-and-engine pair. Follow-ups collect four samples per entitled, configured engine and compare only matching cohorts. Aelo now says `improved` or `regressed` only when the two 95% confidence intervals do not overlap; small, mismatched, legacy, or overlapping evidence is shown as `inconclusive` with the reason and before/after sample counts.

### Files changed

- `lib/measurement/comparison.ts`
- `lib/interventions.ts`
- `app/api/interventions/[id]/measure/route.ts`
- `app/(dashboard)/dashboard/interventions/page.tsx`
- `tests/unit/measurement-comparison.test.ts`
- `tests/integration/measurement-truth-contract.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests and checks

- Extreme matched cohorts produce improved/regressed verdicts only with non-overlapping intervals.
- Cohorts below four samples, legacy single points, mismatched prompts/engines, and overlapping intervals remain inconclusive.
- Route contract requires the canonical measurement service, four samples, atomic quota, and no direct one-shot scanner call.
- Full `npm test` after implementation → 55 passed.
- `npm run typecheck` passed.
- Targeted ESLint across the comparison, snapshot, route, UI, and tests passed.
- `git diff --check` passed before this progress update.

### Compatibility and limits

- Existing JSONB snapshot fields remain; sample counts, rates, timestamps, and contract version are additive.
- The UI still understands legacy `no_change` receipts, but new measurements emit `inconclusive` instead.
- One intervention click reserves one scan unit for the whole target-prompt batch. Failed provider samples are reported, and an all-failed batch does not overwrite the intervention as measured.
- Live provider and authenticated browser checks were not run because no authorized test login was supplied.

### Commit hash

`d3e9653` — `fix: make intervention evidence comparable`

## Batch 2C — Canonical first-run and scheduled scans

### Problem addressed

The signed-in scan route, onboarding result cards, automatic workspace scan, and cron worker still used one provider answer per engine. Onboarding displayed the analyzer's self-rating as a visibility percentage, the signed-in route checked quota with a read-then-act race, and recurring scans could keep using engines after a plan downgrade.

### User impact

First-run, manual signed-in, workspace-creation, and recurring measurements now collect four samples per entitled, configured engine through `measurement.v1`. Onboarding shows mention rate as visibility and separately names the successful sample count and confidence level. All-provider failure returns an explicit failed state instead of zero visibility, persistence failure makes a run partial, and scheduled work rechecks current plan access before calling providers.

### Files changed

- `app/api/llm/scan/route.ts`
- `app/api/workspaces/route.ts`
- `app/api/cron/process-scans/route.ts`
- `app/(dashboard)/onboarding/page.tsx`
- `tests/integration/api-auth-boundaries.test.ts`
- `tests/integration/scheduled-scan-contract.test.ts`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests and checks

- Route contracts require four-sample canonical measurement, atomic quota, failure/persistence state, and current entitlements.
- Tests reject the former read-then-act quota check, direct one-shot scanner call, and analyzer-confidence visibility shortcut.
- Full `npm test` after implementation → 57 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across all changed routes, onboarding, and tests → passed.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 134 static pages, and traces completed.
- Generated `.next` build output was removed afterward to recover disk space; source and user data were not affected.

### Compatibility and limits

- The signed-in route keeps its compact `results`, `visibilityScore`, `scannedAt`, and `platformErrors` fields while adding the canonical receipt. The compact result is now an aggregate, not a raw answer.
- A user-requested scan or scheduled run consumes one quota unit while collecting four samples per engine.
- Existing stored rows remain readable. Each new successful sample is stored as its own `llm_scans` row.
- Authenticated onboarding and live provider execution were not browser-tested because no authorized test login was supplied.

### Commit hash

`24b0b47` — `feat: unify product measurement paths`

## Batch 2D — Trustworthy summaries, MCP errors, and public claims

### Problem addressed

Dashboard and API overview scores did not show the sample count or statistical interval behind them. MCP errors flattened HTTP status/retry detail. The homepage presented hard-coded example scores beside “No mock data anywhere,” claimed all four engines were live, and the footer always claimed every system was operational without a health source.

### User impact

Dashboard and tracker summaries now show successful sample counts, mention rates, and Wilson confidence. The visibility API includes mention count/rate and the 95% interval. MCP returns structured status/code/retry detail and describes `measurement.v1`, partial/all-failed behavior, and citation provenance accurately. Public example data is plainly labeled, and unverified live/system-health claims are removed.

### Files changed

- `lib/data-access.ts`
- `lib/analytics/demo-seed.ts`
- `app/api/v1/visibility/overview/route.ts`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/llm-tracker/page.tsx`
- `components/dashboard/metric-card.tsx`
- `mcp-server/src/client.ts`
- `mcp-server/src/index.ts`
- `app/(marketing)/page.tsx`
- `components/marketing/footer.tsx`
- `tests/integration/api-auth-boundaries.test.ts`
- `tests/integration/measurement-truth-contract.test.ts`
- `docs/product-rescue/evidence/batch-2d-homepage-desktop-1440.jpg`
- `docs/product-rescue/evidence/batch-2d-homepage-mobile-390.jpg`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests and checks

- Contract tests require dashboard sample/confidence fields, Wilson intervals, semantic metric buttons, structured MCP errors, accurate citation wording, and labeled marketing examples.
- Full `npm test` → 60 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across all changed app, marketing, MCP, and test files → passed.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 134 static pages, and traces completed.
- Generated `.next` output was removed after the build to recover disk space.

### Browser evidence

- Local homepage at 1440 px: 1440 px viewport, 1434 px document width, no horizontal overflow, no console warnings/errors.
- Local homepage at 390 px: 390 px viewport, 384 px document/body width, no horizontal overflow, no console warnings/errors.
- The accessibility tree exposed the example label, live Gemini free-scan wording, and per-scan availability statement.
- Screenshots: `docs/product-rescue/evidence/batch-2d-homepage-desktop-1440.jpg` and `docs/product-rescue/evidence/batch-2d-homepage-mobile-390.jpg`.
- Authenticated dashboard browser verification remains blocked by the lack of an authorized test login; source, type, lint, contract, and production-build checks passed.

### Compatibility and limits

- Existing dashboard score/change fields and MCP tool names remain. Confidence and evidence fields are additive.
- Historical rows without run metadata can still contribute to window summaries; they are counted honestly as individual stored samples.
- The dashboard score remains the existing composite visibility score. Mention rate and its confidence are now shown separately so the composite is not mistaken for statistical confidence.

### Commit hash

`a9d2396` — `fix: expose honest measurement context`

## Batch 2E — Persisted activation decision packet

### Problem addressed

Onboarding measured one generic brand-awareness question and stopped at provider rows. It did not let the user choose buyer-intent prompts, did not rank a source/action gap, did not preserve the result across refresh, lost paid-plan intent at signup, and redirected to the dashboard even when the onboarding completion write failed.

### User impact

Onboarding now proposes three editable buyer prompts and accepts three to five. One quota-reserved activation batch measures each prompt four times per entitled, configured engine, saves the samples, and persists a versioned packet. The packet shows complete/partial/all-failed/untracked state, per-engine mention rate, successful/failed sample counts, confidence, sample snippets, provider-backed source links, and one ranked next action. A return visit reloads the latest packet. Selected Radar/Command intent survives password or Google signup without starting checkout or charging the user, and a failed completion write stays visible and retryable.

### Files changed

- `supabase/migrations/029_create_decision_packets.sql`
- `lib/measurement/decision-packet.ts`
- `lib/measurement/persistence.ts`
- `app/api/onboarding/decision-packet/route.ts`
- `app/(dashboard)/onboarding/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/api/auth/signup/route.ts`
- `app/auth/callback/route.ts`
- `components/auth/google-button.tsx`
- `tests/unit/decision-packet.test.ts`
- `tests/integration/measurement-truth-contract.test.ts`
- `tests/integration/api-auth-boundaries.test.ts`
- `docs/product-rescue/evidence/batch-2e-signup-command-desktop-1440.jpg`
- `docs/product-rescue/evidence/batch-2e-signup-command-mobile-390.jpg`
- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`

### Tests and checks

- Unit fixtures cover ranked grounded-source action, partial/untracked persistence, and all-provider-failed repair guidance.
- Contract tests require 3–5 prompts, four samples, atomic quota, saved packets, RLS, raw sample receipts, source gaps, plan-intent preservation, eight-character password consistency, and retryable onboarding completion.
- Full `npm test` → 65 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across activation, auth, packet service/routes, and tests → passed.
- `npm run build -- --webpack` → passed: compilation, TypeScript, 135 static pages/routes, and traces completed.
- Generated `.next` output was removed after checks.

### Browser evidence

- `/signup?plan=command` at 1440 px showed the selected Command plan, explicit no-charge copy, programmatic labels for name/email/password, and the eight-character instruction. No console warnings/errors or horizontal overflow.
- At 390 px the viewport was 390 px, body/document width 384 px, with no horizontal overflow or console warnings/errors.
- Screenshots: `docs/product-rescue/evidence/batch-2e-signup-command-desktop-1440.jpg` and `docs/product-rescue/evidence/batch-2e-signup-command-mobile-390.jpg`.
- Authenticated prompt editing, live providers, packet persistence, and return-visit rendering could not be browser-tested without an authorized test account. They are covered by unit/contract/type/build checks only; no auth bypass was used.

### Migration and rollback

- Apply migration 029 after 028. It creates one additive table and index; existing scan and workspace rows are unchanged.
- Authenticated clients have read-only, organization-scoped RLS. Packet writes use the authenticated server route plus owner/admin/editor role checks and the service role.
- Before rollback, export any packet JSON needed for support. Rollback is `DROP TABLE public.decision_packets;`; stored `llm_scans` evidence remains intact.
- Deploying code before migration makes saved-packet reads/writes fail; apply the migration first.

### Remaining risks

- One activation batch can make up to 5 prompts × 4 samples × entitled engines and has a 300-second route budget. Durable queued execution remains the safer long-term design for large/provider-slow batches.
- Packet source gaps use only provider-backed citations returned in this batch. If providers supply none, the ranked action becomes a direct-answer publishing recommendation and says why.
- Prompt-library persistence is secondary to packet persistence; a prompt-library write failure is logged and does not falsify the saved measurement packet.

### Commit hash

`a8664b5` — `feat: persist activation decision packets`

## Batch 3A — Persisted Actions and weekly decision inbox

### Problem addressed

Insights saved lane changes only in one browser, while Interventions held separate database evidence. Neither surface offered a complete shared workflow for assigning work, recording the hypothesis/source, validating state transitions, or reviewing an audit trail. The sidebar exposed roughly 22 peer destinations, and the weekly email reported a broad single-week score without requiring a comparable prior cohort or recording delivery failure honestly.

### User impact

Insights and Interventions now converge on one persisted **Actions** queue. A scan-derived suggestion can be saved exactly once, assigned to an organization member, moved through a validated planned → doing → shipped → measured workflow, and reviewed with its hypothesis, source, target prompt, stable baseline, history, and uncertainty-aware receipt. The old `/dashboard/insights` URL remains reachable and redirects to Actions. The primary sidebar now exposes five user jobs—Overview, Prompts & Scans, Sources, Actions, and Reports & Settings—while every legacy route remains under More tools.

Overview now includes a weekly decision inbox. It compares the last seven days with the seven before that per prompt and engine, requires at least four samples in each cohort, and displays a gain or loss only when the two 95% Wilson confidence ranges do not overlap. Weekly email uses the same material-change list, claims one delivery per workspace/week, skips empty inboxes, and records failed or unconfigured delivery instead of claiming it was sent.

### Files changed

- `supabase/migrations/030_persist_team_actions.sql`
- `supabase/migrations/031_weekly_digest_delivery.sql`
- `lib/actions.ts`
- `lib/weekly-inbox.ts`
- `lib/insights.ts`
- `lib/email.ts`
- `app/api/interventions/route.ts`
- `app/api/interventions/[id]/route.ts`
- `app/api/dashboard/decision-inbox/route.ts`
- `app/api/cron/weekly-digest/route.ts`
- `app/(dashboard)/dashboard/interventions/page.tsx`
- `app/(dashboard)/dashboard/insights/page.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/weekly-decision-inbox.tsx`
- `components/dashboard/analytics/citation-map.tsx`
- `components/emails/WeeklyDigestEmail.tsx`
- `tests/unit/actions.test.ts`
- `tests/unit/weekly-inbox.test.ts`
- `tests/integration/actions-contract.test.ts`
- `tests/integration/weekly-digest-contract.test.ts`

### Tests and checks

- Domain tests cover allowed/forbidden state transitions, validated evidence URLs, stable insight idempotency keys, minimum weekly cohort size, confidence-qualified material changes, and matching open work.
- Contract tests require additive organization-scoped action/event storage, server-only mutations, workspace binding, role checks, legacy Insights redirect, one delivery claim per week, material-only digest input, and visible failed delivery.
- Full `npm test` → 75 passed.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- Targeted ESLint across every changed TypeScript file → passed with no warnings or errors.
- First `npm run build -- --webpack` attempt stopped with `ENOSPC` while writing generated `.next` files. After removing only `.next`, the clean retry passed: compilation, TypeScript, 136 static pages/routes, and traces completed.
- Generated `.next` output was removed after the successful build to recover disk space.

### Browser and state coverage

- Loading skeletons, empty lanes, suggestion state, request errors with retry, owner controls, valid forward actions, measurement busy state, audit history, weekly empty/qualified states, and digest failure storage are implemented and covered by type/contract checks.
- Authenticated Actions, assignment persistence across two users/devices, and the weekly inbox could not be exercised in a real browser because no authorized non-production login was supplied. No auth bypass or production data was used.
- Production migrations were not applied. Supabase CLI/Docker is unavailable, so migrations 030–031 have static contract coverage and require staging execution before deployment.

### Migration and rollback

- Apply migration 030 after 029, then 031. Code that selects the new action/event or digest-delivery fields must not deploy before both migrations.
- Migration 030 adds nullable action metadata, one partial unique insight index, and `action_events`. It replaces the old broad authenticated `FOR ALL` intervention policy with organization-scoped read-only policies; writes remain in validated server routes.
- Migration 031 adds `weekly_digest_deliveries`, a nullable notification dedupe key/index, and a service-role-only delivery claim function.
- Rollback code before dropping data-bearing tables. For schema rollback: drop `claim_weekly_digest_delivery`, drop `weekly_digest_deliveries`, drop the notification dedupe index/column, drop `action_events`, drop the action insight index, then drop the six additive intervention columns and restore the prior intervention policy if the old application still needs direct authenticated writes. Export action history/delivery failures first if support records must be retained.

### Remaining risks

- Action row update and audit-event insert are two server calls rather than one database transaction. An event failure is surfaced as a retryable 500 and never presented as success, but a database RPC should make the pair atomic in a later reliability pass.
- Action measurement now reuses a caller-provided retry key for quota and event deduplication. A worker crash before the receipt is saved still returns a clear 409 on retry because the quota reservation cannot yet distinguish running from abandoned work; durable measurement jobs remain future work.
- Model/version/region/scorer compatibility is completed in Batch 3C; older rows without those fields are intentionally excluded from change claims.
- Email delivery remains blocked in environments without `RESEND_API_KEY`; the new delivery row and notification make that failure visible.

### Commit hash

`04cf945` — `feat: persist team actions and weekly decisions`

## Batch 3B — Responsive, accessible product shell and honest states

### User impact

The dashboard now uses one shared shell for the mobile drawer and desktop sidebar offset. The drawer traps focus, closes with Escape or route change, locks background scrolling, and returns focus to its trigger. A keyboard skip link reaches dashboard content. Shared buttons meet the 44px mobile and 40px dense-desktop target, reduced-motion preferences disable decorative movement, and the product modal now uses the existing Radix dialog so focus is trapped and restored.

Login, password recovery, onboarding, and the public free scan have programmatic labels in the core journey. Dashboard loading, onboarding failure, notification failure, retry, and route error states no longer silently masquerade as empty data. The duplicate onboarding request on every dashboard navigation was removed. Production cannot enable the development auth bypass.

### Verification

- Full `npm run lint` passed with 0 errors and 67 pre-existing warnings.
- App and MCP type checks passed.
- Full suite passed after this batch; the final count is recorded below.
- Browser checks at 390, 768, 1024, and 1440 found no horizontal overflow or unlabeled login inputs. At 390, both sign-in controls measured 44px. `/dashboard` redirected an unauthenticated browser to `/login`, and no browser console warnings/errors were recorded.
- Evidence: `docs/product-rescue/evidence/batch-3b-login-390.png` and `batch-3b-login-1440.png`.
- Authenticated drawer/actions/settings checks were not run because no authorized test login was supplied. Axe was not run because the repository has no axe dependency. Keyboard semantics are covered by the shell/dialog implementation and static contracts, but the in-app browser did not advance focus when sending Tab, so that browser assertion remains open.

### Files and contracts

- Added `components/dashboard/dashboard-shell.tsx`, `app/(dashboard)/loading.tsx`, and `tests/integration/dashboard-shell-contract.test.ts`.
- Reworked sidebar/header/onboarding/error/auth/free-scan/dialog behavior and shared target sizes.
- Removed the unused browser-only `insights-board.tsx` implementation after the route became a server redirect.
- Corrected TypeScript/React lint failures across the audited product surfaces; warnings that do not fail the gate remain listed by the full lint command.

### Commit hash

`03afc17` — `fix: make product shell responsive and accessible`

## Batch 3C — Comparable measurement metadata

### Problem addressed

Prompt and engine equality alone cannot prove two cohorts are comparable when a provider changes models, the measurement region changes, or Aelo changes its scorer. The weekly inbox and action receipt previously lacked those dimensions.

### Change

Migration 032 adds additive nullable receipt fields for measurement run ID, contract version, sample number, provider model, configured region, measurement mode, and scorer version. Every canonical sample now populates those fields through one persistence adapter. Weekly and intervention comparisons require matching model, region, mode, scorer, and contract metadata plus the existing prompt, engine, sample-count, and confidence rules. Legacy or partially tagged cohorts become inconclusive instead of supporting a change claim.

`AELO_MEASUREMENT_REGION` is the deploy-time region label. If it is unset, receipts say `global-unspecified`; Aelo does not infer location.

### Verification and rollout limit

- Full test suite: 85 passed, 0 failed.
- Focused lint and app type-check passed.
- Migration 032 has static contract coverage but was not executed against Supabase because Supabase CLI/Docker is unavailable in this workspace.
- Code that selects these columns must not deploy before migration 032.

### Commit hash

`04316fe` — `fix: require comparable measurement metadata`

## Final local verification and handoff

### Passed

- `npm run lint` exited successfully with 0 errors. It reports 67 non-blocking warnings, mainly unused imports plus three legacy hook-dependency warnings and one unoptimized marketing image.
- `npm run typecheck` passed.
- `npm run typecheck:mcp` passed.
- `npm test` passed: 85 tests, 0 failures.
- `npm run build -- --webpack` passed from a clean `.next`: compilation, TypeScript, 136 pages/routes, optimization, and traces completed. Next used its WebAssembly compiler because the optional native SWC package is absent.
- `git diff --check` passed.
- Public/auth browser checks passed at 390, 768, 1024, and 1440 with no horizontal overflow, no unlabeled login fields, 44px mobile sign-in controls, correct unauthenticated dashboard redirect, and no console warnings/errors.
- Read-only live check on 2026-08-29: `https://aelohq.com/` returned 200 HTML, and `https://aelohq.com/api/v1/visibility/overview` returned the expected 401 JSON (`Invalid or missing API key`). This confirms the domain and protected API are deployed, not provider-engine liveness.

### Not run or not claimed

- No deployment and no production database mutation.
- Migrations 025–032 were not executed because this workspace has no Supabase CLI/Docker. Static SQL contracts passed; staging must exercise the real migration chain.
- No clean dependency reinstall was attempted: the existing lockfile install was used, and the machine has constrained disk space.
- No authenticated multi-role E2E, real cross-device Actions assignment, axe scan, 200% zoom matrix, live engine liveness matrix, or provider test-mode billing webhook run was possible without an authorized staging account/database and provider test setup.
- The in-app browser did not move focus when Tab was sent, so keyboard behavior is supported by semantic controls, Radix, and static contracts but still needs manual staging confirmation.

### Ordered commits

1. `1012d9b` baseline and plan
2. `351542f` release gates
3. `3a952b4` tenant/billing authority
4. `8c8f53e` billing idempotency
5. `298f531` honest measurement evidence
6. `71709ff` API authorization and quota
7. `8436873` scheduled-scan claims
8. `022e1ce` shared production limits
9. `bcae09c` outbound-fetch/SSRF controls
10. `8c5b3b3` signed analytics ingestion
11. `3c8a935` canonical measurement contract
12. `d3e9653` comparable intervention evidence
13. `24b0b47` canonical product measurement paths
14. `a9d2396` honest evidence context
15. `a8664b5` activation decision packets
16. `04cf945` persisted Actions and weekly decisions
17. `03afc17` responsive/accessibility shell
18. `04316fe` model/region/scorer-compatible cohorts

The final documentation commit follows these implementation commits.

## Batch 4 — Evidence-first product interface and source contract

### Problem addressed

The authenticated product still looked like a generic analytics template. Overview gave a secondary composite health score more visual weight than the core visibility measurement, provider results appeared as unrelated rainbow cards, and Sources opened the legacy Analytics page before reaching citation evidence. The opt-in demo also reported 23 successful samples while exposing only eight receipt rows, which broke the product's central trust promise.

### User impact

Overview now leads with the successful-answer mention rate, sample count, confidence, engine coverage, and one-click receipts as a single evidence rail. Per-engine results sit beside the overall claim, qualified weekly decisions follow it, and secondary health/content/forum numbers are explicitly labeled as context rather than the score.

Prompts & Scans now presents engines as one neutral, comparable evidence table instead of color-coded score cards. Its connection label reflects the actual realtime subscription state, its mobile form stacks without horizontal page overflow, and repeated samples no longer duplicate engine keys in recent prompt groups.

Sources is now a first-class route at `/dashboard/sources`. It ranks domains only from structured provider citations, exposes exact observed URLs, separates owned-domain evidence, and labels missing source types as research leads rather than guaranteed ranking factors. Links found only in generated prose remain excluded.

The local demo seed now generates exactly the 23 receipt rows behind its 23-sample visibility result, including provider model, run, sample, region, mode, scorer, and contract metadata.

### Files changed

- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/llm-tracker/page.tsx`
- `app/(dashboard)/dashboard/sources/page.tsx`
- `app/api/analytics/citations/route.ts`
- `components/dashboard/analytics/citation-map.tsx`
- `components/dashboard/header.tsx`
- `components/dashboard/sidebar.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `lib/analytics/demo-seed.ts`
- `tests/unit/demo-seed.test.ts`
- `tests/integration/measurement-truth-contract.test.ts`

### Verification

- `npm test` → 110 passed, 0 failed.
- `npm run lint` → passed with 0 errors and 64 pre-existing warnings; changed interface files add no warnings.
- `npm run typecheck` → passed.
- `npm run typecheck:mcp` → passed.
- `npm run build -- --webpack` → passed; compilation, TypeScript, 138 routes, page generation, optimization, and traces completed. Next used its WebAssembly compiler because the optional native SWC package is absent.
- `git diff --check` passed before documentation was updated and must be rerun for final handoff.

### Browser evidence and open gates

- Overview was exercised at 1440×1000 and 390×844 using the development-only auth bypass and explicit `AELO_DEMO_SEED=1`; visibility, confidence, sample count, four-engine coverage, recent evidence, and supporting context rendered together.
- Prompts & Scans was exercised at both widths. At mobile width, document and client width both measured 384px, proving no horizontal page overflow. The scan form stacks and the tab strip scrolls within its own container.
- Opening ChatGPT's 83% row produced six receipts for the reported `n=6`; the new unit test enforces receipt/mention counts for every demo engine.
- Sources rendered its honest no-provider-citations state. A contract test covers provider-only filtering, domain output, exact URL access, and the primary sidebar route.
- Actions rendered its explicit action-history error because the local database lacks the required migration. No migration was applied and no action data was fabricated.
- A final clean console/network-log rerun was interrupted by the browser controller after the visual and interaction checks had passed. Fresh console/network inspection, authenticated multi-role testing, 200% zoom, keyboard-only operation, and axe remain staging gates.

### Migration and deployment limit

No migration was applied and no deployment was attempted. The local database still lacks migration 032 fields and later action/job/alert objects, so demo mode was used only for non-production browser verification. Staging must apply 025–036 and both timestamped alert migrations before exercising the complete journey.

### Commit hash

`147b4b8` — `feat: make product evidence-first`
