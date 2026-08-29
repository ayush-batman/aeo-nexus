# Aelo Product Rescue — Executive Summary

**Audit date:** 2026-08-29  
**Scope:** repository, public marketing site, unauthenticated local flows, public competitor material, build/static checks  
**Constraint:** audit only; no application code, configuration, dependencies, database, infrastructure, or production data changed

## Overall assessment

Aelo has a credible strategic wedge—defensible multi-sample AI visibility with source receipts and intervention proof—but the current product does not consistently deliver that promise. The strongest measurement path exists in `/api/v1/scan`; the primary onboarding, dashboard, tracker, and intervention flows still use single observations or show scores without sample context. More seriously, the current database policies and billing handlers contain launch-blocking authorization risks. The product should not acquire paying multi-tenant users until Batch 1 is complete and verified.

**Health:** Red / pre-scale. The public site is deployed and the unauthenticated shell works, but trust, tenant safety, billing integrity, and release gates are not production-ready.

## Ten highest-risk findings

| # | Priority | Finding | Evidence | Why it matters |
|---|---|---|---|---|
| 1 | P0 | Users can likely promote themselves to super-admin or change tenant membership through an unrestricted self-profile update policy. | `supabase/migrations/004_fix_rls_policies.sql:24-27`; sensitive columns in `supabase/schema.sql:20-28`; trust in `lib/admin.ts:9-21` | Tenant takeover and cross-tenant access. Must be verified against a clean database because production migration state is unknown. |
| 2 | P0 | Organization owners can likely write `organizations.plan` directly and self-upgrade. | `supabase/migrations/004_fix_rls_policies.sql:34-37`; `supabase/schema.sql:8-16`; `lib/entitlements.ts:20-53` | Billing and entitlement integrity failure. |
| 3 | P0 | Razorpay webhook processes unsigned payloads when its secret is missing, then trusts request notes for org and plan. | `app/api/webhooks/razorpay/route.ts:15-57` | Anyone who can reach the route may forge an upgrade if the secret is absent. |
| 4 | P0 | Brand detection creates deletion variants and performs substring matching; “Aelo” can match ordinary “AEO.” | `lib/ai/ai-analyzer.ts:25-80` | A deterministic false positive corrupts the exact number the product sells as honest. |
| 5 | P0 | “Citations” from most engines are URL-like strings extracted from ungrounded generated text, not provider-native source evidence. | `lib/ai/llm-scanner.ts:43-63,66-129,276-292` | Hallucinated URLs can be presented as sources an engine actually read. |
| 6 | P0 | The main UI does not consistently use multi-sample measurement; onboarding and tracker use single calls while dashboard scores omit sample/confidence context. | `app/(dashboard)/onboarding/page.tsx:122,171-188`; `app/(dashboard)/dashboard/llm-tracker/page.tsx:77,198`; `app/(dashboard)/dashboard/page.tsx:270-390`; contrast `app/api/v1/scan/route.ts:34-143` | The core customer promise is not the default customer experience. |
| 7 | P0 | Intervention “improved/regressed” receipts compare one latest row to one new scan. | `lib/interventions.ts:12-43`; `app/api/interventions/[id]/measure/route.ts:65,102,129-175` | Stochastic variation can be misrepresented as causal proof. |
| 8 | P1 | Public unauthenticated test-user endpoint deletes/recreates a fixed account using the service role. | `app/api/setup-test-user/route.ts:4-38` | Production-dangerous account manipulation and published fixed credentials. |
| 9 | P1 | API scan uses `read` scope, does not enforce scan quota, discards provider errors, and can return success after persistence failure. | `app/api/v1/scan/route.ts:37-54,60-69,101-145` | Cost abuse, misleading partial results, and unreliable tracking. |
| 10 | P1 | No working release gate: lint could not start, type-check fails, default build cannot use native compiler, fallback build ran out of disk, and build ignores TypeScript errors. | `package.json:5-12`; `next.config.mjs:2-5`; observed commands in `03-technical-audit.md` | Known correctness failures can ship silently. |

## Five highest-leverage product improvements

1. **Make one versioned multi-sample measurement object the product truth.** Every onboarding result, dashboard score, API response, scheduled scan, intervention baseline, and report must consume it.
2. **Redesign activation around a decision packet.** Use 3–5 high-intent category prompts, entitled engines, four samples, confidence/sample count, exact source gap, and one ranked action.
3. **Collapse the 22-destination dashboard into five user jobs.** Recommended: Overview, Prompts & Scans, Sources, Actions, Reports & Settings.
4. **Merge Insights and Interventions into one persisted team action queue.** Each action must preserve baseline, owner, state, evidence, comparable follow-up, and result.
5. **Use the weekly digest as the repeat-use surface.** Show what changed, confidence, why it matters, and the next action—not another broad dashboard.

## Five highest-leverage engineering improvements

1. Lock sensitive user/org columns behind server-only functions and immutable-column checks; add RLS regression tests.
2. Fail closed on billing webhooks; validate signature, amount, currency, event status, allowed plan, tenant binding, and idempotency.
3. Replace heuristic citation extraction with provider-native provenance and correct brand/domain matching with golden tests.
4. Move scan execution to an idempotent durable job model with bounded parallelism, timeouts, engine status, and transactional persistence.
5. Establish a required CI gate: clean install, lint, app/MCP type-check, unit tests, integration tests, clean migration test, and production build.

## Fix before acquiring more users

- Close all P0 authorization, billing, scoring, citation, and measurement-consistency findings.
- Remove the public test-user route.
- Enforce API scopes, quotas, shared rate limits, failure disclosure, and persistence semantics.
- Add tenant/RLS, webhook, scoring, scan-failure, and API auth regression tests.
- Make the default activation result genuinely multi-sampled and label every illustrative marketing number.
- Verify production migration `024_create_api_keys`, provider liveness per engine, Resend, cron secrets, Stripe, and Razorpay in a non-production environment.

## What should not be rebuilt

- Do not rewrite the Next.js/Supabase application. The main problem is unsafe boundaries and inconsistent product truth, not the framework.
- Keep the multi-sample `/api/v1/scan` response concept, API-key hashing/scoping foundation, MCP client/server boundary, existing Supabase tenant entities, provider adapters, and public free-scan acquisition wedge.
- Keep dual billing providers if India and global checkout are both required, but converge them on one server-owned entitlement transition service.
- Keep the honest-zero/provider-unavailable philosophy; fix the implementation and claims around it.
- Defer crawler analytics, broad content generation, more engines, white-label features, and agent/copilot breadth until the core loop retains users.

## Recommended implementation order

| Batch | Outcome | Expected user benefit |
|---|---|---|
| 1 — Stabilize critical failures | Secure tenant/billing boundaries; correct brand/citation truth; remove dangerous route; restore release gate | Users can trust that their data, plan, and reported evidence are real and isolated. |
| 2 — Repair activation and core journey | Canonical multi-sample measurement, high-intent onboarding, engine failure states, decision packet | A new user reaches a defensible first insight instead of a decorative single score. |
| 3 — Improve repeat use | Persisted Actions queue, comparable intervention measurement, weekly digest | Teams know what to do next and can prove whether it worked. |
| 4 — Architecture and maintainability | Durable scan jobs, shared rate limits, centralized RBAC/entitlements, smaller bounded modules | Fewer outages, cost surprises, race conditions, and inconsistent permission decisions. |
| 5 — Polish, performance, accessibility | Simplified IA, responsive/keyboard QA, loading/error state system, bundle/render work | The product becomes faster to understand, easier to operate, and credible in reviews/demos. |

## Decision

**No-go for paid multi-tenant growth today.** Go to a controlled design-partner beta only after Batch 1 passes the acceptance gates in `06-test-and-acceptance-plan.md`. Proceed to broader acquisition after Batch 2 shows a reproducible first decision packet in an end-to-end test and observed user session.

