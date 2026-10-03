# Technical Audit

## Baseline

| Area | Observed implementation |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind 4; `app/` route groups for marketing, auth, dashboard, admin, and API |
| Package manager | npm (`package-lock.json`); root package `aeo-nexus` |
| Frontend | Server and client components; 65 client-marked files observed by reviewer; Radix primitives, Recharts, Framer Motion, jsPDF/html2canvas |
| Backend | Next route handlers in `app/api`; business/data code under `lib/`; service-role Supabase client for privileged server operations |
| Data | Supabase Postgres/Auth/RLS; schema file plus migrations `002`–`024` and two unnumbered admin migrations |
| Auth | Supabase SSR cookies; `proxy.ts` refreshes session and redirects protected paths; optional environment/cookie dev bypass |
| API | Internal cookie-auth routes plus `/api/v1`; bearer API keys hashed with SHA-256 and scoped to workspace/org |
| Measurement | Provider adapters in `lib/ai/llm-scanner.ts`; analyzer in `lib/ai/ai-analyzer.ts`; scoring in `lib/scoring.ts`; multi-sample aggregation in `/api/v1/scan` |
| Billing | Razorpay and Stripe checkout/webhook routes; organization plan drives `lib/entitlements.ts` |
| MCP | Separate `mcp-server` TypeScript package invoking `AELO_API_BASE` with `AELO_API_KEY` |
| Deployment | Vercel config with three cron routes; `next.config.mjs` ignores TypeScript build errors |
| Email | Resend wrapper and React Email components |
| Testing/CI | No root test/typecheck script, no formal test suite/config, no tracked CI workflow found; ad-hoc scripts only |
| Logging/observability | Console logging in routes; no structured logger, trace correlation, error service, SLO, or health/status source found |

## Architecture map

### Important directories and ownership

| Path | Responsibility | Concern |
|---|---|---|
| `app/(marketing)` | Homepage, pricing, docs, content, public receipt | Static/client boundary and trust claims |
| `app/(auth)`, `app/auth/callback` | Login, signup, recovery, OAuth callback | Form accessibility and policy consistency |
| `app/(dashboard)` | Onboarding and authenticated product | Many 300–1,000-line client pages; duplicated data fetching |
| `app/(admin)` | Super-admin UI | Depends on mutable `users.is_super_admin` |
| `app/api` | Product APIs, crons, billing, public scan | Auth/RBAC/entitlement patterns vary by route |
| `app/api/v1` | API-key product surface | Good wrapper concept but scan scope/quota/failure semantics are wrong |
| `components/ui` | Shared primitives | Useful base; several call sites bypass semantic controls |
| `components/dashboard` | Shell, metrics, receipts, feature UI | Oversized sidebar/header and local-only action state |
| `lib/ai` | Provider calls, analyzer, claim/content logic | Citation provenance and brand-match correctness risks |
| `lib/data-access.ts` | Broad data access and bootstrap logic | 783 lines, type failures, mixed ownership |
| `lib/supabase` | Browser/server/admin clients and middleware | Clear client split; service-role callers need centralized authorization |
| `lib/analytics`, `lib/alerts`, `lib/interventions.ts`, `lib/insights.ts` | Derived product intelligence | Inconsistent measurement semantics and newest-row shortcuts |
| `supabase/migrations` | Incremental data schema/RLS | No `001` baseline migration; production state unknown |
| `mcp-server` | Published/standalone MCP client | Separate install/build lifecycle currently not type-checking locally |
| `scripts` | Diagnostics/manual tests | Excluded from TypeScript check; many may touch external systems |

### Main entities

`organizations` → `users` and `workspaces` → `products`, `llm_scans`, prompts, schedules, insights/derived tables, interventions, alerts, analytics events, accuracy claims, and API keys. The organization `plan` is the entitlement root; workspace is the API-key and measurement isolation root.

### Critical flows

1. **Browser auth:** request → `proxy.ts` → Supabase `getUser()` → protected-route redirect → page/client data fetch.
2. **UI scan:** cookie user → workspace context → entitlements/quota → provider calls → analyzer → `llm_scans` → dashboard derivation.
3. **API/MCP scan:** bearer key → `lib/api-auth.ts` → scope/rate wrapper → provider calls repeated per sample → service-role insert → aggregate response.
4. **Scheduled scan:** API/UI schedule → `scheduled_scans` → Vercel cron → provider scanner → persistence. API-created schedules currently persist an empty platform list.
5. **Billing:** checkout metadata/notes → provider webhook → update `organizations.plan` → `lib/entitlements.ts` controls engines/features.
6. **Intervention:** select latest scan as baseline → action record → re-measure → single before/after verdict and receipt.

### Coupling and unclear ownership

- Measurement meaning is duplicated across onboarding, tracker, API, dashboard, insights, interventions, and scoring.
- Authorization is split among RLS, cookie context, service-role routes, API-key wrapper, and route-local role assumptions.
- Entitlement reads use a cookie/RLS client even in API-key context.
- Dashboard pages contain data fetching, transformation, business rules, presentation, export, and state in single large files.
- Build includes the nested MCP source because root `tsconfig.json` includes `**/*.ts`; MCP also has its own install state.

## Security and correctness findings

### P0 launch blockers

1. **Sensitive profile fields are client-writable (high confidence, deployment conditional).** `Users can update own profile` has only `USING (id = auth.uid())` and no safe column boundary (`004_fix_rls_policies.sql:24-27`). Because `org_id`, `role`, and `is_super_admin` are on the row (`schema.sql:20-28`), direct Supabase updates may self-escalate. `lib/admin.ts:9-21` trusts the flag. Fix with privilege revocation, safe RPC/server route, column-specific model, `WITH CHECK`, and immutable-column trigger. Audit existing rows.
2. **Plan is client-writable by owner (high confidence, deployment conditional).** Organization update policy does not restrict `plan` or payment IDs (`004...:34-37`). Entitlements trust plan (`lib/entitlements.ts:20-53`). Only billing/admin service should mutate those fields.
3. **Razorpay webhook fails open.** Missing secret permits unsigned processing; request notes choose org/plan (`app/api/webhooks/razorpay/route.ts:15-57`). Fail closed, use timing-safe signature verification, retrieve provider-side payment/order, validate amount/currency/status/plan, and record idempotent events.
4. **Brand scorer false-positive.** Deletion variants plus substring matching allow “Aelo” to match “AEO” (`lib/ai/ai-analyzer.ts:25-80`). Remove deletion variants, normalize exact aliases/domains, use token boundaries, and add golden tests including short brands.
5. **Citation provenance is false or ambiguous.** Plain generation calls lack grounding/search, then regex extracts URLs (`llm-scanner.ts:43-63,66-129,276-292`). Store provider-native citation objects and raw provenance. Call other URLs “links mentioned,” not “sources read.”
6. **Core measurement is inconsistent.** See `01-product-and-ux-audit.md`; a single model classification is presented as visibility in onboarding, and intervention proof is single-point.

### P1 high-priority findings

- **Public destructive test route:** unauthenticated GET deletes/recreates a fixed account with service role (`app/api/setup-test-user/route.ts:4-38`). Remove or exclude from production.
- **API scan authorization/cost:** `/api/v1/scan` requires `read`, not `measure`, and never enforces weekly quota (`app/api/v1/scan/route.ts:37-54`). Use centralized service-owned entitlements and atomic cost reservation.
- **Partial outage hidden:** API ignores scanner errors and only returns successful engines; persistence error is logged but response still succeeds (`/api/v1/scan:60-69,101-145`). Return requested/succeeded/failed engine state and tracked/untracked status.
- **Probable scan timeout:** four samples × multiple engines × analyzer calls run sequentially inside a 60-second route (`/api/v1/scan:5,60-99`; `llm-scanner.ts:239-355`). Use durable jobs, bounded parallelism, per-call timeout/retry, and idempotent sample IDs.
- **In-memory rate limit:** per-process LRU resets across serverless instances and rejects at `>=`, effectively allowing N−1 (`lib/rate-limit.ts:8-31`). Upstash dependencies already exist; use atomic shared weighted limits.
- **SSRF in crawler:** workspace-controlled website becomes a server fetch to `/robots.txt` (`app/api/v1/crawlers/route.ts:6-13`; `lib/crawlers.ts:27-43`). Block private/loopback/link-local/metadata ranges after DNS and redirects; add HTTPS, timeout, size, and redirect limits.
- **Analytics poisoning:** unauthenticated CORS `*` endpoint trusts caller `workspace_id` and inserts using service role (`app/api/analytics/track/route.ts:4-64`). Authenticate/sign, bind allowed domain/workspace, validate/body-limit, rate-limit, dedupe.
- **Stripe webhook likely no-ops:** signed correctly, but uses unauthenticated cookie/anon client for RLS-protected organization updates and ignores errors (`app/api/stripe/webhook/route.ts:37-105`). Use service role, validate allowlisted price→plan mapping, check affected row/errors, and idempotency.
- **Empty MCP schedules:** API persists `platforms: []`; cron passes it through; scanner defaults only when undefined (`app/api/v1/scans/schedule/route.ts:13-23`; `app/api/cron/process-scans/route.ts:133-140`; `llm-scanner.ts:234-240`). Reject empty list or resolve entitled engines at run time.
- **Role bypass in service routes:** workspace/API-key mutations authorize membership/current workspace, then use service role without consistently enforcing owner/admin or brand limits (`app/api/workspaces/route.ts:31-105`; `app/api/keys/route.ts:22-52`; `app/api/keys/[id]/route.ts:7-21`). Centralize RBAC/entitlement decisions.
- **Public receipt enumeration/privacy:** `public_scans` RLS `USING (true)` exposes all rows to direct anon Supabase queries, including optional email (`019_public_scans.sql:14-42`). Remove anon table SELECT; expose high-entropy share token through server endpoint; isolate email.

### P2 findings

- Cron secrets compare against `Bearer undefined` if unset; require configured secret before comparison. Crons also process serially without claim/lock/idempotency.
- Own-domain detection is substring-based; normalize hostname and require equality/subdomain boundary.
- No root CI/test gate; scripts are excluded from type-check; `next.config.mjs` skips type validation.
- Root `postinstall` writes fake `iceberg-js` distribution files. This is a fragile supply-chain/build workaround and should be removed by fixing the upstream dependency boundary.
- The migration directory begins at `002`; `schema.sql` appears to be a manual baseline. A clean automated migration path is not demonstrated.
- Middleware catches Supabase auth failure and proceeds anonymous. Protected routes still redirect, but operational visibility and explicit error classification are weak.
- No Content Security Policy was observed; current security headers are partial, and obsolete `X-XSS-Protection` is present.

## Performance and maintainability

- Largest pages: analytics 1,078 lines; forum hub 877; settings 873; prompts 836; tracker 832; dashboard 611; onboarding 546. `lib/data-access.ts` is 783 lines and scanner 502.
- Client-side onboarding gate and duplicated context/entitlement/workspace requests create a waterfall.
- Static marketing page is client-rendered; heavy charts/motion are statically imported in analytics.
- No route-level loading files were found; many failures collapse into empty states.
- Recommendation: define focused measurement, authorization, billing-transition, and scan-job modules first. Split UI pages only along those real boundaries; do not perform a cosmetic rewrite.

## Commands discovered

| Purpose | Repository command/status |
|---|---|
| Install | `npm install` (lockfile present; not run because audit forbids dependency changes) |
| Dev | `npm run dev` → `next dev`; local fallback used `npx next dev --webpack` because native SWC was absent |
| Build | `npm run build` → `next build`; fallback diagnostic `npx next build --webpack` |
| Start | `npm start` → `next start` |
| Lint | `npm run lint` → `eslint` |
| Type-check | No script; `npx tsc --noEmit` inferred from `tsconfig.json` and executed |
| Unit/integration/E2E | No formal command configured |
| MCP build | `cd mcp-server && npm run build` → `tsc` |
| MCP start | `cd mcp-server && npm start` |

## Checks actually run

| Command/check | Result |
|---|---|
| `npm run lint` | Failed to start: `eslint: command not found`. Dependencies are incomplete. |
| `npx tsc --noEmit` | Failed with scanner cast, alerts, data-access insert typing, unresolved MCP SDK, and MCP implicit-`any` errors. |
| `npx tsc -p mcp-server/tsconfig.json --noEmit` | Failed: MCP SDK modules unresolved and implicit-`any` errors. |
| `npm run build` | Failed before compile: Next native SWC missing; Turbopack cannot use WASM on darwin/arm64. |
| `npx next build --webpack` | Compiled successfully while explicitly skipping type validation, then failed during export with `ENOSPC`. |
| `df -h .` | Data volume 99% full with about 2.8 GiB available at the time checked. |
| Local dev | Sandbox start failed to bind; approved start succeeded with Webpack on port 3001 because port 3000 was occupied. |
| Browser homepage | Live and local Aelo returned expected page; no console warn/error captured on observed loads. |
| Auth redirect | Unauthenticated `/dashboard` redirected to `/login`. |
| Mobile public page | 390×844 above-the-fold rendered without observed overlap; dashboard mobile was not browser-tested. |

No dependency install, test database, payment, provider scan, production API, or destructive security test was performed.

