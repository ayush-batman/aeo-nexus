# Test and Acceptance Plan

## Current test baseline

There is no automated release test suite or CI gate in the repository. Files named `test-*` under `scripts/` are ad-hoc diagnostics and are excluded from the root TypeScript check. Do not treat them as regression coverage. The first deliverable is a reproducible clean-install and test harness, not a large feature suite.

## Proposed release commands

Add explicit scripts and make CI run them in this order:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
npm --prefix mcp-server ci
npm --prefix mcp-server run typecheck
npm --prefix mcp-server run build
```

These are proposed acceptance commands; they do not all exist today. `npm install`/`npm ci` was not run during the audit because dependencies may not be changed.

## Test pyramid and ownership

| Layer | Tool recommendation | Scope | Must block release |
|---|---|---|---|
| Unit | Vitest | scoring, brand/domain matching, confidence, plan mapping, error classification | Yes |
| Database/RLS | Supabase local/test Postgres + SQL/Node harness | tenant isolation, immutable fields, constraints, migrations, concurrency | Yes |
| Route integration | Vitest or Node test runner against route/service functions | auth/scope/quota, webhooks, scan states, SSRF, analytics ingest | Yes |
| Contract | JSON schema/type fixtures | UI/API/MCP measurement compatibility and versioning | Yes |
| E2E | Playwright | signup→packet, return loop, billing test mode, keyboard/mobile | Yes for core smoke |
| Accessibility | axe + keyboard + manual screen-reader smoke | public, auth, onboarding, five core app destinations | Yes for critical/serious violations |
| Performance | Lighthouse/Web Vitals + server timings | public page, decision packet, large prompt/source tables | Budget gate |
| Reliability | fault injection/stubs | provider timeout/rate limit/partial failure, retries, idempotency | Yes |

## Batch 1 acceptance tests

### Tenant and privilege isolation

1. Authenticated owner attempts direct update of own `role`, `org_id`, and `is_super_admin`; each is rejected and values remain unchanged.
2. Authenticated non-owner attempts organization `plan`, Stripe/Razorpay IDs, another member role, API-key create/revoke, and workspace create; each is rejected.
3. Owner can update only allowlisted profile/organization display fields through the intended server path.
4. User in org A cannot select/insert/update/delete org B workspaces, products, scans, prompts, actions, notifications, public receipt emails, or keys.
5. Service jobs can perform only their intended writes; route-level authorization is tested before service-role use.
6. Existing privileged rows are enumerated in an audit report without exposing secrets.

**Acceptance:** zero unauthorized reads/writes in a clean database and upgraded database fixture.

### Billing

For both Stripe and Razorpay:

- missing secret → configuration failure, no mutation;
- missing/invalid signature → 400, no mutation;
- valid signature with unknown price/plan → rejected, no mutation;
- valid signature with wrong amount/currency/status/org binding → rejected;
- duplicate event → one entitlement transition;
- out-of-order update/delete → deterministic final state;
- database update failure → non-2xx so provider retries;
- valid test event → correct org/plan/provider IDs and audit record;
- client cannot write plan directly.

**Acceptance:** plan is derived only from server-owned price mapping and verified provider state.

### Brand and domain matching golden corpus

Required fixtures:

- `Aelo` must not match standalone `AEO`, `SEO`, `aelohq competitor`, or partial deletion variants.
- `Aelo`, `aelo`, `Aelo HQ`, and configured exact aliases match at token boundaries.
- Short brands (`AI`, `X`, `Go`) require explicit alias/domain context; no fuzzy deletions.
- Unicode, punctuation, possessive, plural, case, hyphen, and whitespace normalization.
- `example.com` matches `example.com` and `www.example.com`; does not match `notexample.com`.
- Full URL input normalizes host; IDN/punycode behavior is defined.

**Acceptance:** no known false positive/negative in reviewed corpus; corpus version is stored with scorer version.

### Citation provenance

1. Provider-native grounded citation is stored with provider, URL, title, sample ID, raw provider reference, and fetch-validation state.
2. URL in ungrounded model prose is labeled `link_mentioned`, never `provider_citation`.
3. Perplexity structured citations are used rather than discarded.
4. Invalid/private/redirect-loop URLs are not fetched and are visibly invalid/unverified.
5. UI and exports preserve provenance label.

**Acceptance:** every displayed “source AI read/cited” has provider-native evidence.

### Dangerous routes and release gate

- Production route manifest does not expose `/api/setup-test-user`.
- Dev auth bypass cannot activate in production build even if a client sets the cookie.
- `npm run lint`, `npm run typecheck`, clean migration, unit/integration tests, MCP checks, and production build are mandatory and cannot be skipped by `ignoreBuildErrors`.

## Batch 2 acceptance tests

### Canonical measurement contract

Every measurement response includes:

- schema/scorer version;
- prompt/brand and normalized aliases;
- requested engines and per-engine success/failure;
- model/provider/version when available;
- region/mode and start/end timestamps;
- target and completed sample count;
- per-sample raw evidence pointer/snippet;
- mention rate and position distribution;
- confidence definition/value;
- citation provenance;
- persistence/tracked state;
- safe run/request ID.

Contract fixtures are consumed by web UI, `/api/v1`, MCP, schedule worker, report, and intervention service. A fixture change must fail all incompatible consumers.

### Measurement semantics

1. Four identical mentions → 1.0 mention rate, high agreement, n=4.
2. Two mentions/two misses → 0.5 rate, medium/low confidence per documented calibration; never silently rounded into certainty.
3. Two successes/two provider failures → result is partial, completed n=2, failure count 2; blended score cannot hide missing engine.
4. All failures → provider-unavailable result, not zero visibility.
5. Persistence failure → scan may return evidence but is marked untracked; no “saved/tracked” success copy.
6. Retry with same idempotency key does not double charge or duplicate samples.

### API/MCP auth and quotas

- missing/bad/revoked key → 401;
- valid `read` key calling scan/schedule → 403;
- `measure` key in correct workspace → allowed;
- wrong workspace/entity ID → 404/403 without existence leak;
- quota reserved atomically under concurrent calls;
- rate response is 429 with safe retry metadata;
- limits hold across two app instances;
- request cost is weighted by engines × samples;
- MCP maps 401/403/429/partial/failure without hiding detail.

### Activation E2E

Disposable test account:

1. Signup and verify email or approved test shortcut.
2. Enter brand/domain/category; review/edit 3–5 prompts.
3. Start scan and observe progress without a blank full-screen gate.
4. Inject one provider failure; packet clearly marks it.
5. Open an engine/sample receipt and a grounded source.
6. See confidence/n and one ranked action.
7. Refresh and return; packet persists.
8. Selected pricing plan survives signup but no charge occurs without explicit checkout.

**Acceptance:** user can explain the result and next action in an observed usability session without moderator correction.

## Batch 3 acceptance tests

### Actions and intervention proof

- Insight creates exactly one persisted action with owner/status/hypothesis/source and baseline cohort.
- Two users in same org see updates; unauthorized tenant does not.
- State transitions are validated and audited; refresh/device change preserves state.
- Follow-up requires comparable prompt, engine, model policy, region, sample count/window, and scorer version or explicitly marks incompatibility.
- Improved/regressed requires defined effect and confidence; otherwise verdict is inconclusive.
- Duplicate/retried measurement does not duplicate action events.
- Share/export preserves baseline/follow-up samples, failures, provenance, and methodology version.

### Weekly digest

- Includes only material, confidence-qualified changes.
- Explains change, evidence, why it matters, owner/next action.
- Deduplicates events and honors preferences.
- Failed email remains visible/retryable; no false “sent.”

## Reliability and abuse tests

- Provider timeout, 429, 500, malformed payload, slow response, and partial stream.
- Worker crash after external call but before persistence; retry remains idempotent.
- Cron invoked twice concurrently; only one job claim.
- Large queue respects execution/time/cost limits and exposes backlog.
- SSRF targets: localhost, RFC1918, IPv6 local, link-local, cloud metadata, DNS rebinding, redirect-to-private, oversized body, infinite redirect, slowloris.
- Analytics: forged workspace, invalid signature, oversized body, schema explosion, replay, high volume, CORS/domain mismatch.
- Public scan: concurrent rate-limit race, IP header spoofing policy, receipt enumeration attempt, email privacy.

## Accessibility acceptance

- All inputs have programmatic labels, instructions, and error association.
- Full core journey works with keyboard only; focus order and visible focus are logical.
- Dialogs trap/restore focus and close with Escape; menus expose expanded state.
- No clickable non-semantic `div` remains in core flow.
- 44×44px mobile targets (40px dense desktop minimum).
- No critical/serious axe findings on public, auth, onboarding, packet, sources, actions, settings.
- Normal text contrast ≥4.5:1; large text ≥3:1; UI/focus boundaries ≥3:1 where applicable.
- Reduced-motion setting removes movement while preserving state feedback.
- 200% zoom and 390px width have no horizontal loss of core content.

## Performance budgets

- Public homepage LCP ≤2.5s p75, CLS ≤0.1, INP ≤200ms on agreed mobile test profile.
- Decision packet shell gives meaningful feedback within 1s; long scan progress remains responsive.
- No duplicate workspace/onboarding/entitlement request per navigation.
- Heavy charts/PDF code loads only when its view/action is opened.
- Prompt/source tables remain responsive at agreed maximum plan size; virtualization threshold documented.
- Each provider call has timeout and measured latency/cost; queue exposes p50/p95 and failure rate.

## Manual browser matrix

| Surface | Widths | Browsers | States |
|---|---|---|---|
| Public/auth | 390, 768, 1024, 1440 | Chromium, Safari, Firefox | default, validation, network error, loading, success |
| App shell | 390, 768, 1024, 1440; 200% zoom | Chromium, Safari | nav open/closed, keyboard, long names, no data |
| Decision packet | same | Chromium, Safari | full, partial, all failed, stale, untracked |
| Sources/actions/reports/settings | same | Chromium | loading, empty, error, large data, permission denied |

## Audit checks actually completed

- `npm run lint` — failed to start (`eslint` missing).
- `npx tsc --noEmit` — ran and found application/MCP errors.
- `npx tsc -p mcp-server/tsconfig.json --noEmit` — ran and failed.
- `npm run build` — ran and failed due missing native SWC/Turbopack support.
- `npx next build --webpack` — compiled, skipped types, then failed with no disk space.
- Local Aelo dev server — started on port 3001; public/auth routes observed.
- Live `https://aelohq.com` — homepage observed deployed.
- Desktop/mobile public render and unauthenticated dashboard redirect — observed.

No test in this document should be marked passed until its command and assertion output are stored by CI or an auditor.

