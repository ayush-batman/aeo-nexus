# Aelo Production Cutover Implementation Plan

> This is a checked execution record, not permission to change a database or route live traffic. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Aelo's verified legacy application data into a clean Convex production deployment and release the matching app without losing evidence, tenant boundaries, or rollback options.

**Architecture:** Keep the old Supabase project and currently live `aelo-test` Convex deployment untouched as rollback sources. Create a separate empty Convex project, verify a stable 337-row Supabase export, and import through the guarded runner. Then merge the current live Aelo workspace and its evidence into the imported owner's existing organization (the app currently selects one organization per session), prove the union of both sources, and only then bind and verify Vercel before assigning live traffic. The redundant old Aelo user, organization, membership, and nonportable component runtime state remain in the hash-verified backup rather than being replayed.

**Tech Stack:** Supabase REST export, Convex CLI and internal import functions, Next.js, Vercel CLI/dashboard.

**Spec:** `docs/product-rescue/CONVEX_IMPORT_RUNBOOK.md` and `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md`.

## Global Constraints

- Never print or commit credentials, raw customer records, `.env` files, or export files.
- Never test with production customer data or live payment credentials.
- Preserve the Supabase source and existing `laudable-orca-31` live deployment until verified cutover and rollback checks finish.
- Do not enable scheduled workers or billing webhooks until their ownership and replay state are reconciled.
- Stop before changing live traffic if source/target parity, production configuration, auth, or smoke checks fail.
- The owner will temporarily have two preserved brands in one free-plan organization. Treat this as a grandfathered migration exception, not a new free-plan promise or a reason to erase either populated brand.

---

### Task 1: Freeze the source comparison and recovery point

**Files:** No tracked source changes; private export files under `tmp/convex-migration/`.

**Interfaces:** Produces a hash-verified 27-table application export and a count-only Auth/Storage inventory for Task 3.

- [x] **Step 1:** Confirm the Supabase project is Healthy and take two new read-only REST exports with `scripts/convex/export-supabase.ts --allow-production-export --allow-nontransactional-rest-export` into separate ignored private directories.
- [x] **Step 2:** Compare every table's `count`, `missing`, and `sha256` values; reject a moving source. Run the no-network package check:

```sh
npx tsx scripts/convex/import-convex.ts --input tmp/convex-migration/cutover-20260928.siC6gQ/export-a --dry-run
```

- [x] **Step 3:** Record only counts and hash-equality results. Keep the source project online and unchanged. Inventory Auth users and Storage buckets without exposing identities. A full source database backup is unavailable on its Free plan, so do not describe the application export as a complete database backup.

Result: both exports match in all 27 tables, 337 application rows, and source fingerprint. Supabase Auth has 16 identities (15 with app users); Storage has 0 buckets. Neither source was changed.

### Task 2: Provision and verify an isolated destination

**Files:** No tracked source changes; a private deploy-key file outside Git.

**Interfaces:** Produces a newly named Convex production origin and deployment-scoped key for Tasks 3–5.

- [x] **Step 1:** Create the dedicated project in the known `ayush-grover` Convex team. The local CLI is logged into a different team, so this was done in the verified Convex dashboard rather than by the illustrative CLI commands below:

```sh
npx convex project create aelo-production --team ayush-grover
npx convex deployment create ayush-grover:aelo-production:prod --type prod --default
```

- [x] **Step 2:** Verify the new deployment's URL, team, type, and empty tables in the Convex dashboard. Do not select it as the local development deployment or overwrite `.env.local`. Verified Production `jovial-scorpion-617` at `https://jovial-scorpion-617.convex.cloud`, with no tables.
- [x] **Step 3:** Create a short-lived, deployment-scoped migration key for `jovial-scorpion-617` in the verified dashboard. It has deploy, data read/write, internal-function, backup-view, and backup-import rights only. The initial key lacked backup rights and was revoked after a replacement was created; neither key value was committed. Convex's CLI import requires both `deployment:backups:view` and `deployment:backups:import` in addition to data permissions.

### Task 3: Push schema, import, and prove parity

**Files:** `convex/` only if the existing release candidate fails validation; matching focused regression tests for any code fix.

**Interfaces:** Consumes Task 1's verified export and Task 2's deployment key; produces all-table source/staging/destination parity.

- [x] **Step 1:** Run `npm test` (now 278 node + 78 Convex tests), `npm run lint`, `npm run typecheck`, `npm run typecheck:mcp`, and `npm run build -- --webpack`; all passed on this package.
- [x] **Step 1A:** Deployed the checked Convex functions and schema only to verified `ayush-grover/aelo-production` Production `jovial-scorpion-617`; deployment/type-check and schema validation passed. The old `aelo-test` deployment was not targeted.
- [x] **Step 2:** Verified the destination was empty, then imported the stable 337-record/27-table export with `scripts/convex/import-convex.ts` and exact-target confirmation. The importer reported verified counts.
- [x] **Step 3:** Independently ran `scripts/convex/check-parity.ts` against that export and exact origin **before** the live-Aelo merge; all 27 tables passed.

### Task 3A: Preserve the currently live Aelo workspace

**Files:** `scripts/convex/merge-live-aelo.ts`, `tests/unit/convex-live-aelo-merge.test.ts`; add only narrowly scoped internal functions in `convex/` if the CLI cannot preserve the records safely.

**Interfaces:** Consumes Task 3's imported owner, a target-before snapshot, and a fresh, file-inclusive backup of `laudable-orca-31`. Produces a second, independently checked migration receipt for 19 historical documents: its Aelo workspace, product, four scans, four scan metrics, one measurement run, four samples, one skipped measurement job, one quota reservation, and two completed weekly jobs. The old free organization is consolidated into the imported owner's free organization by remapping four top-level `organizationId` references. The old user/membership, Better Auth accounts/sessions, and completed workflow/rate-limit component state are not copied. A verified owner sign-in must claim the imported profile and reach the Aelo workspace. This is a logical consolidation, not byte-for-byte table parity for the old tenant identity.

- [x] **Step 1:** Take and verify a fresh backup of `laudable-orca-31`, including file storage. Inventory all app and Better Auth table counts without printing customer records. The existing owner email appears in the Supabase export under a different public ID, so reject any merge that creates a second `users.normalizedEmail` row. The backup is in Convex's 7-day recovery store and privately downloaded with SHA-256 prefix `f32c104c8d2470e5`.
- [x] **Step 2:** Add synthetic regression tests for ID remapping, single-owner identity, raw scan/citation preservation, quota reservation, active-job rejection, replay collisions, and parity tampering. Focused and full tests, lint, both type checks, and build pass.
- [x] **Step 3:** Took and privately downloaded a file-inclusive target-before snapshot. The guarded package builder prepared 19 historical documents across nine tables with preserved `_id`, `_creationTime`, raw evidence, and references except the deliberate organization consolidation. Applied all nine JSONL files with deployment-key-bound `npx convex import --table <table> --append`; none used `--replace`. One initial import request failed at permission checking before writing any row; the independent legacy parity check still passed, and a corrected key was used.
- [x] **Step 4 (data parity):** Took and privately downloaded a file-inclusive target-after snapshot. `merge-live-aelo.ts --verify-after` passed exact document parity for all 19 rows and unchanged imported owner/organization/membership. Owner sign-in and workspace selection remain unverified; they are a Task 4 release gate.

The package builder's offline preflight ran against the actual downloaded old-live backup and found all 22 app records, terminal historical jobs, zero stored files, zero pending component work, and a valid 19-record relationship graph. Scans and scan metrics refer to a measurement run by its **public** ID; samples refer to the Convex document ID. The builder and synthetic tests enforce that distinction.

### Task 4: Bind the app and verify without live traffic

**Files:** Vercel Production configuration only after Task 3 passes; tracked code only for a tested defect.

**Interfaces:** Consumes Task 3's verified origin and key; produces a Ready, signed-in tested release candidate.

- [ ] **Step 1:** Finish the new Convex Production deployment's runtime settings. A names-only dashboard audit confirmed it currently has just `SITE_URL` and `AUTH_TRUSTED_ORIGINS`. The old Production deployment has `BETTER_AUTH_SECRET`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PUBLIC_SCAN_IP_SALT`; move only the values still needed after explicit authorization, without revealing them in logs or chat. The new deployment also needs verified `RESEND_API_KEY` and `AELO_AUTH_EMAIL_FROM` for signup/password reset and the appropriate engine keys for each advertised engine. `convex/billingActions.ts` requires `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` and `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`; none appeared in the new deployment's names-only audit, so do not claim billing works. Keep test-mode and live-mode payment credentials separate and verify webhook destinations before any live checkout. Confirm Google OAuth's callback permits the new backend before switching traffic.
- [x] **Step 1A:** Staged the live `ayush-batmans-projects/aeo-nexus` project's Production-only Convex cloud/site URLs, `CONVEX_SERVER_KEY`, and `AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT`. The server key has only three internal-function-run rights. Preview remains on its separate test deployment. These settings take effect only on a new Production deployment; no Production redeploy has happened yet.
- [ ] **Step 1B:** Preserve access for verified legacy users before switching the app. Supabase Auth has 16 identities; 15 match imported app users, of which 14 have confirmed emails. Twelve of those 14 have no linked Google identity. Their old password cannot be reused. A guarded private package for the 14 verified matched users, with no passwords or sessions, was imported into the **initially empty** Better Auth component `user` table in `jovial-scorpion-617`; the one unverified app user and one auth-only identity were excluded. The one-use importer verified exact name/email/verification/timestamps after import, and the dashboard shows 14 documents. Both temporary import keys were revoked; only the limited app-runtime key remains. Email delivery and email-only password reset must still pass on a non-production account, then existing customers must be told to set a new password. Do not silently send bulk customer mail or mark this gate complete from data parity alone.
- [ ] **Step 2:** On an authorized non-production account, verify Google signup/login, onboarding, partial and complete scans, evidence/citations, dashboard decisions, API-key 401/403/429, MCP, email, and test-mode billing. Do not use customer data or live charges for these checks.
- [ ] **Step 3:** Build and inspect a new Vercel deployment with the exact configuration. A names-only audit of the correct `ayush-batmans-projects/aeo-nexus` project found only the four staged Production variables from Step 1A. Its contact route requires `RESEND_API_KEY`; without it the form returns 503. `CRON_SECRET` is also absent, so the four protected cron routes reject requests if those routes are used (the checked-in `vercel.json` currently schedules no cron). The contact sender's stale default domain was corrected in source, but real delivery and the receiving mailbox still need verification. Check desktop/mobile console and network errors and the Vercel error logs before any live alias change.

The latest local public-browser rehearsal passed all nine marketing routes at desktop (1440px) and mobile (390px), including console/network failures, overflow, keyboard skip link, interactive sample controls, and reduced-motion behavior. This does not cover signed-in journeys or the Production deployment. The Resend dashboard currently redirects to sign-in, and no `RESEND_API_KEY` is present in local environment files; real email delivery remains unverified.

After the contact sender fix, the focused contact-page browser run passed at both 1440px and 390px without page errors, network failures, or overflow. A synthetic local form submission returned the expected 503 and visible retry guidance with no browser console errors; no email was sent. This verifies the missing-mail failure state, not real delivery.

### Task 5: Cut over and preserve rollback

**Files:** `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md` release record.

**Interfaces:** Consumes Tasks 1–4; produces a verified live release with an unchanged rollback source.

- [ ] **Step 1:** Quiesce or account for writes on both old sources, then repeat each source's count/hash comparison against the exported snapshots. If either source changed, stop the cutover. Refresh the snapshot and restart in a fresh isolated destination, or build and verify an explicitly approved delta path; the current guarded importer does **not** support an automatic post-completion delta.
- [ ] **Step 2:** Point the live Vercel project at the verified deployment. Confirm the custom domain serves the intended commit and backend, then run bounded sign-in, read-only dashboard/API, and error-log checks.
- [ ] **Step 3:** Keep Supabase and the prior Vercel deployment intact. If a gate fails, restore only the matching prior app/backend pair; reconcile writes before any data-owner reversal. Record exact deployment IDs, results, and rollback location without secrets.

The read-only Supabase REST export was repeated after the 337-row import and 19-row merge. Its source fingerprint and all 27 table counts, missing flags, and SHA-256 hashes still match the import source. This does **not** yet establish that the separate, currently live `laudable-orca-31` source has stayed unchanged; refresh or account for that source immediately before cutover.

The new Convex Production deployment has `SITE_URL` and `AUTH_TRUSTED_ORIGINS` set. Its inherited auth/provider secrets and Resend sending configuration are not yet verified. A fresh target backup was saved before the historical merge and another after it; neither is a substitute for a last-minute source freshness check.

After the Better Auth identity import, the downloaded target-after-merge backup plus the private hash-verified identity package are the recoverable inputs; a new post-identity Convex backup has not been taken. A read-only old-live dashboard check showed one workspace and four scans, matching the earlier backup counts, but the full source document hash comparison is still outstanding. Do not infer source parity from those two counts alone.

## Self-review

- [ ] Source, destination, export, auth, billing, evidence, and rollback requirements from the two spec documents are represented above.
- [ ] No production record content or key value belongs in this plan or release log.
- [ ] The source-export path, target origin, and deployment key must be resolved and verified at execution; no example URL is authority to move data.
