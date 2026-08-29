# Prioritized Rescue Roadmap

## Scoring model

Scores use 1–5 where 5 is highest. **User**, **Business**, and **Risk** increase priority. **Confidence** describes evidence strength. **Effort** is relative implementation cost. Sequence also respects dependencies: secure truth and boundaries before redesigning surfaces that consume them.

## Prioritized recommendations

| ID | Pri | Recommendation | Category | User | Business | Risk | Confidence | Effort | Dependencies |
|---|---|---|---|---:|---:|---:|---:|---:|---|
| R1 | P0 | Lock `users.org_id/role/is_super_admin` and org plan/payment fields; audit existing values | Security | 5 | 5 | 5 | 5 | 3 | Clean migration path |
| R2 | P0 | Make both billing providers fail-closed, server-owned, validated, and idempotent | Security/billing | 5 | 5 | 5 | 5 | R1 |
| R3 | P0 | Correct brand/domain matching and add golden regression corpus | Correctness | 5 | 5 | 5 | 5 | None |
| R4 | P0 | Store/display provider-native citation provenance; relabel ungrounded URLs | Correctness/product | 5 | 5 | 5 | 5 | Provider capability map |
| R5 | P0 | Define one versioned multi-sample measurement object and confidence vocabulary | Product/architecture | 5 | 5 | 5 | 5 | R3, R4 |
| R6 | P0 | Remove public test-user route and dangerous production dev paths | Security | 4 | 5 | 5 | 5 | None |
| R7 | P1 | Require `measure` scope, central entitlement/RBAC, atomic quota and weighted shared rate limit | API/security | 4 | 5 | 5 | 5 | R1, R5 |
| R8 | P1 | Return requested/succeeded/failed engines and transactional tracked status | Reliability | 5 | 5 | 4 | 5 | R5 |
| R9 | P1 | Build canonical decision-packet activation with 3–5 high-intent prompts | Customer journey | 5 | 5 | 4 | 5 | R5, R8 |
| R10 | P1 | Replace single-point intervention verdict with comparable sample cohorts | Product/correctness | 5 | 5 | 5 | 5 | R5 |
| R11 | P1 | Persist and merge Insights + Interventions into a team Actions queue | Product/data | 5 | 4 | 3 | 5 | R5, R10 |
| R12 | P1 | Simplify top-level IA to five user jobs | UX | 5 | 4 | 3 | 5 | R9, R11 |
| R13 | P1 | Responsive dashboard shell and minimum hit targets | UX/accessibility | 4 | 4 | 3 | 5 | R12 |
| R14 | P1 | Explicit loading/empty/error/partial/stale state contract | Reliability/UX | 5 | 4 | 4 | 5 | R8 |
| R15 | P1 | Add clean install/lint/type/test/migration/build CI gate | Testing/release | 4 | 5 | 5 | 5 | Disk/dependency repair |
| R16 | P1 | SSRF protection and signed/bounded analytics ingest | Security | 3 | 4 | 5 | 5 | Central request controls |
| R17 | P1 | Durable idempotent scan jobs with bounded parallelism/timeouts | Architecture/reliability | 5 | 5 | 4 | 4 | R5, R7, R8 |
| R18 | P2 | Weekly decision digest and return-user inbox | Retention | 5 | 5 | 2 | 4 | R11, R17 |
| R19 | P2 | Auth/form semantics, password consistency, dialog/focus/keyboard repair | Accessibility | 4 | 3 | 3 | 5 | None |
| R20 | P2 | Preserve plan intent through signup; align pricing copy with actual quotas | Conversion | 4 | 4 | 2 | 5 | R2 |
| R21 | P2 | Server-render static marketing and shared app data; stream/lazy-load heavy UI | Performance | 3 | 3 | 2 | 5 | R14 |
| R22 | P2 | Consolidate semantic design/chart/status tokens and verify contrast/motion | Design system/a11y | 3 | 3 | 2 | 5 | R12, R13 |
| R23 | P3 | Add crawler analytics, more models, agents, white-label, content breadth | Long term | 2 | 2 | 3 | 3 | Retention proven |

## Batch 1 — Stabilize critical failures

**Goal:** make tenant boundaries, billing, measurement primitives, and release verification safe enough for a controlled beta.

1. Freeze paid/multi-tenant acquisition and document the incident-ready owner.
2. Add a clean baseline migration and a migration test environment.
3. Revoke client updates to sensitive user/org fields; replace with safe profile and billing mutation paths; add immutable-field triggers.
4. Audit existing super-admin, role, org membership, plan, and payment-ID values.
5. Rebuild Razorpay/Stripe webhooks around server-owned price/plan maps, signature verification, provider retrieval, state validation, idempotency, and checked database updates.
6. Remove `app/api/setup-test-user/route.ts` from production surface.
7. Replace brand deletion/substrings and own-domain substring logic; add golden corpus.
8. Implement citation provenance classification: provider-grounded, link-mentioned, unavailable.
9. Establish CI and make TypeScript errors block production builds; repair dependency/disk state.

**Exit gate:** every Batch 1 test in `06-test-and-acceptance-plan.md` passes on a clean database and staging deployment. No P0 remains open.

## Batch 2 — Repair activation and core journey

**Goal:** every new user reaches one defensible decision packet.

1. Specify `MeasurementRun`, `EngineMeasurement`, `SampleEvidence`, `CitationEvidence`, and confidence/version semantics.
2. Make UI, API, MCP, scheduled scans, dashboards, and exports consume the same measurement service.
3. Include engine requested/success/failure, sample target/completed, model/version, time/region, and tracked status.
4. Require `measure` scope and reserve quota/cost atomically.
5. Redesign onboarding around 3–5 editable buyer prompts and one ranked gap/action.
6. Replace all hard-coded “real number,” live-engine, and system-status claims with labeled examples or live evidence.
7. Preserve selected pricing plan through signup.

**Exit gate:** a disposable user can sign up, obtain a multi-sample packet with honest partial failure, open raw evidence/source provenance, and understand the next action without help.

## Batch 3 — Improve repeat-use experience

**Goal:** turn evidence into durable team work and defensible proof.

1. Merge Insights and Interventions into one persisted Actions queue.
2. Record owner, state, hypothesis, targeted prompt/engine, baseline cohort, source, timestamps, and follow-up cohort.
3. Define “improved/regressed/inconclusive” from comparable cohorts and uncertainty, not one delta.
4. Build weekly decision digest/inbox with material changes only.
5. Add share/export formats that preserve sample/provenance metadata.

**Exit gate:** an action can be assigned, completed, re-measured, and shared across sessions/users with an uncertainty-aware verdict.

## Batch 4 — Architecture and maintainability

**Goal:** make the core loop reliable and cheaper to change.

1. Durable scan queue with idempotent run/sample IDs, bounded parallelism, timeouts, retries with jitter, and dead-letter visibility.
2. Shared Redis weighted rate limiting and quota reservation.
3. Central RBAC/entitlement service for cookie and API-key callers.
4. Signed bounded analytics ingest and hardened crawler fetch boundary.
5. Split oversized data/pages along measurement, actions, reports, billing, and settings boundaries.
6. Structured logs, request/run IDs, error classification, latency/cost metrics, provider health, and alerts.

**Exit gate:** repeated/delayed provider/webhook/cron events are idempotent; a partial outage is observable; no route makes an unbounded external call without timeout/cost control.

## Batch 5 — Polish, performance, and accessibility

**Goal:** make the repaired loop fast and credible to operate.

1. Five-job responsive IA and app shell.
2. Route-level skeletons and explicit data states.
3. Semantic labels/controls, Radix dialogs, keyboard path, skip link, focus handling, 44px mobile targets.
4. Contrast and reduced-motion compliance.
5. Server-render marketing shell, dedupe server data, lazy-load charts/export code, and measure bundles/web vitals.
6. Consolidate semantic tokens and one evidence-instrument visual hierarchy.

**Exit gate:** core journeys pass keyboard, screen-reader smoke, mobile/zoom, Web Vitals budget, and visual-state review.

## Categories

- **Immediate bug fixes:** R1–R8, R15–R16.
- **Customer-journey improvements:** R9, R11–R14, R18, R20.
- **Product strategy decisions:** beachhead persona, confidence definition, free sample count, evidence standard, agency timing.
- **Architecture improvements:** R5, R7, R17, centralized authorization and measurement.
- **Security improvements:** R1, R2, R6, R7, R16.
- **Testing improvements:** R15 plus the full acceptance plan.
- **Performance improvements:** R17, R21.
- **Design-system improvements:** R13, R19, R22.
- **Longer-term opportunities:** public India benchmarks with reproducible receipts; calibrated confidence by engine/prompt class; agency channel after core retention.

## Rewrite decision

No rewrite is recommended. Incremental replacement should occur only at four explicit boundaries: authorization/entitlements, billing transitions, measurement/provenance, and scan execution. Preserve routes and response compatibility behind adapters; release with feature flags; dual-read/compare measurement results before switching; keep rollback to the old read path until acceptance thresholds pass.

