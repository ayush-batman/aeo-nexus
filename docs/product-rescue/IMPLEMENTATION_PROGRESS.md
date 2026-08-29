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

Pending Batch 1B commit; will be recorded in the next progress update.
