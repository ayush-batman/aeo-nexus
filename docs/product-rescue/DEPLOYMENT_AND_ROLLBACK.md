# Aelo product-rescue deployment and rollback

## October 3 live-domain check — `www.aelohq.com` serves `jovial-scorpion-617`

This supersedes the earlier entries below that describe `www.aelohq.com` as serving the September 26 deployment on `laudable-orca-31`. The check was made from outside Vercel: only public pages, public JavaScript bundles and the signed-out session endpoint were loaded. No Vercel or Convex dashboard was opened, and no production data, setting, account or billing was touched.

- **Live backend.** The JavaScript bundles served by `www.aelohq.com` name only `jovial-scorpion-617.convex.cloud`, the `ayush-grover/aelo-production` Production deployment from `docs/superpowers/plans/2026-09-28-aelo-production-cutover.md`. They do not name `laudable-orca-31` or `woozy-starfish-810`. (`happy-otter-123` also appears in the bundles, but it is the example URL in a Convex client error message, not a real deployment.)
- **Live code.** After PR #3 (`bfb2ccd`) was merged at 20:49 UTC, the site's CDN cache was invalidated at about 20:51 UTC. The new bundle reports Next `16.3.8`, the version that PR introduced. So `main` deploys to Production automatically.
- **When the backend changed.** At 20:50 UTC the cached page, which had been cached at about 20:34 UTC, already named `jovial-scorpion-617`. So the switch happened on an earlier Production deployment, probably the one triggered by merging PR #2 at 20:31 UTC. This is inferred from timing; the Vercel deployment list was not checked. The Production-only variables staged in cutover-plan Task 4 Step 1A took effect on that deployment. Because it deployed, the build-time guard in `lib/release/convex-target.mjs` accepted the configuration.
- **Signed-out health.** All 11 public routes returned 200 in 0.2–0.5 s: `/`, `/product`, `/pricing`, `/methodology`, `/about`, the four `/solutions/*` pages, `/login` and `/signup`. `/api/auth/get-session` returned 200 with `null`, the expected signed-out response from the new backend.
- **Separate public host.** `https://aeo-nexus.vercel.app` still serves an older build (Next `16.3.4`) whose bundles name the `woozy-starfish-810` test deployment. It returns 200, and neither merge on October 3 updated it, so it is probably a different Vercel project or deployment; that is unverified. `lib/release/convex-target.mjs` treats this hostname as production. Check which project owns it, and remove or redirect it, before anyone uses it for signup or scans.

**Cutover gates this switch went ahead of.** Live traffic now reaches `jovial-scorpion-617`. These cutover-plan gates were still open in the plan and have **not** been verified since:

- Task 5 Step 1: quiesce the old source, then recheck freshness and parity.
- Task 4 Step 1B: legacy accounts without a Google login cannot use their old password. They need working email-based password reset and a customer notice.
- Task 4 Step 2: signed-in QA on a non-production account.
- Task 4 Step 3: Vercel error-log review.
- Billing and email configuration.

Any writes since the switch went to `jovial-scorpion-617`, so rolling back to `laudable-orca-31` now needs those writes reconciled first (Task 5 Step 3). Weekly jobs should still be off, because `AELO_WEEKLY_JOBS_ENABLED` was absent at the last recorded check; that is unverified now. Signed-in journeys, email, billing and scans were not exercised in this check.

## September 28 migration-package preflight

The restored Supabase source reports Healthy. Its Free-plan backup screen says scheduled project backups are unavailable; the dashboard lists no last backup. The current read-only source comparison below matches the saved 337-row application export, and `import-convex.ts --dry-run` verifies all 27 saved tables and records without contacting Convex. A read-only count found 16 Supabase Auth identities versus 15 application users; comparing normalized emails in memory found all 15 application users in Auth and one Auth identity without an application profile. The source Storage API lists zero buckets. No email addresses or record contents were printed. The importer does not transfer Supabase passwords or sessions, so account claiming still needs a signed-in staging check. This is an application-data package, **not** a full database or Auth backup.

The current branch's local gates pass: 271 Node tests, 78 Convex tests, lint, app and MCP type checks, and a 142-page webpack production build. The build used local configuration; it does not prove that the live Vercel Production environment can build or that signed-in journeys pass there. No production source or destination write, deployment, scan, email, or billing action occurred in this preflight.

## September 28 evening — live-backend lineage check

The owner created a new deployment-scoped Convex key for `laudable-orca-31` and saved it in the live `ayush-batmans-projects/aeo-nexus` Vercel project as a **Production-only secret** named `CONVEX_SERVER_KEY`. The Vercel settings page confirms the variable's presence and scope, not the key's value or a successful authenticated request. Vercel says a new deployment is needed before this setting takes effect; none was started. `AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT` remains unset.

The live Vercel project's Ready Production deployment, created September 26 via `vercel deploy`, serves `www.aelohq.com`. Its Production public Convex URLs name `laudable-orca-31`, so this deployment is the currently configured Convex destination for the live project. That does **not** establish that it contains the intended customer data or that the old Supabase source has been cut over. The Convex Production deployment has Aelo tables, but its `importRuns` table is empty; this only rules out a recorded import through that table, not every possible import path. Convex deployment history is unavailable on the current Free plan. No customer records were opened or used for testing. The owner is unsure whether this deployment was intended as the final customer-data home, so production promotion remains blocked pending an independent source-to-target ownership and parity audit.

With the owner's approval for a read-only comparison, the September 11 Supabase export manifest was checked against the currently deployed Convex `importControl:destinationCountPage` **query**. That query reported `complete: true` and counts of 1 organization, 1 user, 1 workspace, and 4 legacy scans on `laudable-orca-31`; the prior Supabase snapshot recorded 64, 15, 53, and 50 respectively. The old Supabase project was temporarily unavailable while restoring, which caused the initial DNS and REST failures. After the dashboard reported restoration complete, its REST endpoint responded. Two fresh, read-only REST exports each contained 337 rows and matched one another and the September 11 manifest on every table's count, missing-table state, and SHA-256 hash. The current source therefore still has 64 organizations, 15 users, 53 workspaces, and 50 scans; the observed Convex counts are materially lower. The REST exports were non-transactional and do not by themselves establish a cutover-safe snapshot. No current source-to-target hashes were compared, and the Convex `importRuns` table remains empty. The temporary export files were removed after the comparison. No production record contents were displayed, and no source or destination writes, scans, emails, billing, or deployments occurred. **Do not promote or import into this target** until source and destination backups, a cutover-safe export, full all-table parity, and signed-in staging checks are complete.

## September 28 preview-isolation repair and production backup

In the live `ayush-batmans-projects/aeo-nexus` Vercel project, the `laudable-orca-31` cloud and site URL variables are now scoped to **Production only**. New **Preview**-scoped copies name the known `woozy-starfish-810` test deployment. Vercel Authentication with Standard Protection is enabled for existing and future Preview/deployment URLs; an unauthenticated request to the rescue-branch Preview now redirects to Vercel sign-in (HTTP 302), while `www.aelohq.com` still returns HTTP 200. Existing Preview builds retain their old bundled environment until rebuilt, so team members must not use old Previews for synthetic signup or scans even though public access is blocked. No deployment was triggered by these setting changes.

Convex identifies `laudable-orca-31` as the `aelo-test` project's **Production** deployment, with cloud and site addresses matching the Vercel Production values. An immediate backup including file storage completed on September 28 at 10:21 Asia/Kolkata; its dashboard entry says it expires in seven days. This is a recoverable point-in-time snapshot, not proof that this deployment owns all intended customer data or that the app journeys work. The current branch's Production build remains blocked because Vercel still lacks `CONVEX_SERVER_KEY` and `AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT`. The existing `aelo-prod-server` deploy key is listed in Convex, but its value was not revealed or transferred. Do not add a key from the test deployment or set the production sentinel before verifying data ownership and the matching credential. No production data was opened for testing, no billing action or database migration was run, and the live release was not changed.

## September 28 destination-account release audit

Read-only inspection of `ayush-batmans-projects/aeo-nexus` confirms that `www.aelohq.com` serves a Ready Production deployment created on September 26. It is **not** the current rescue branch: commit `88aaa29` is a separate Ready Preview on `codex/product-rescue`. This destination project is distinct from the `agrover12344-9741/aeo-nexus` project described in the September 27 notes below; those notes must not be used as the live domain's current configuration.

The destination project's Vercel settings show exactly three project variables, all scoped to every environment: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CONVEX_URL`, and `NEXT_PUBLIC_CONVEX_SITE_URL`. No shared variables are linked. The public Convex cloud and site URLs both name `laudable-orca-31`, not the known test deployment. The required `AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT` and `CONVEX_SERVER_KEY` are absent. Therefore the current branch's production build guard would reject a fresh Production build. This does **not** prove that the existing two-day-old deployment or its backend journeys work; it predates the guard. No secret values, production data, billing, domains, or settings were changed during this audit.

Because those public Convex URLs are scoped to **all** Vercel environments, destination-project Previews also point at `laudable-orca-31`. The current rescue-branch Preview is publicly reachable (HTTP 200); do not use it for signup, scans, or synthetic test data until Preview is isolated from the intended production backend. The separately protected `aelo-rescue-preview.vercel.app` alias still redirects to Vercel sign-in, but it is not a substitute for isolating the destination project's automatic Previews.

Before any production promotion, independently verify that `laudable-orca-31` is the intended data owner, arrange a recoverable backup, bind a matching server key, complete the integration and signed-in journey checks below, and only then configure the expected-production sentinel and request a new release. Do not copy test credentials or promote the Preview to bypass the guard.

## September 27 production release decision

Production promotion remains blocked. A fresh read-only environment pull from the **accessible new Vercel project** confirms both public Convex URLs still target the `woozy-starfish-810` test deployment, while the required expected-production target variable is absent. The current branch deliberately rejects this configuration during a Production build and on production-host requests. That Vercel account owns zero domains and cannot inspect `aelohq.com`; its environment is **not** verified as the live custom domain's runtime configuration. Public DNS points the domain to Vercel through GoDaddy nameservers. Moving the domain to the new account requires verified domain control and must occur only after the target backend and release are safe. The `laudable-orca-31` candidate Production deployment under `aelo-test` currently reports no backups. The protected preview is Ready, but browser signup says email signup is unavailable and the full signed-in journey is unverified. No production deployment, domain, configuration change, backup, customer-data access, or billing action was performed.

## September 27, 2026 test deployment checkpoint

Code through `f5f11bf` is deployed to Ready Vercel Preview `dpl_4ZJW6xk3hxwcSgh6N8hdWpBaGzMK`. The stable alias `https://aelo-rescue-preview.vercel.app` points to it. Its matching `woozy-starfish-810` **test** Convex backend was last updated for the Analytics functions at `c8fdbf6`; later commits changed only frontend/server routes and test configuration. This is the test version the team has been building, not a production cutover. The scan-summary and workspace-switch routes return 401 without a session when given valid request shapes. The accessible new project's Production environment still targets the test backend and must not be promoted until its separate target, backup, keys, data, and integration gates below are verified. The user's September 27 request authorized test deployment work but did not resolve those production safety checks.

## September 27, 2026 read-only release check

Vercel CLI access to `agrover12344-9741/aeo-nexus` is restored. Its current Production deployment is the September 13 build (`bf8dbc5`), not the latest rescue branch. A read-only pull of **that project's** Production environment confirmed both public Convex URLs still point to the `aelo-test` **Development** deployment `woozy-starfish-810`. This does not establish the separate live custom domain's runtime backend. The temporary local environment copy was removed immediately after checking only those public URLs; no secret values were displayed or changed.

The Convex dashboard shows a distinct **Production** deployment, `laudable-orca-31`, under the existing `aelo-test` project. This may be the production target; do not create another project merely because the September 26 checkpoint did not identify it. Its dashboard says it was last deployed seven days ago and has **no backup yet**. Its environment-variable names include Gemini and Google OAuth settings, but not `RESEND_API_KEY`, `AELO_AUTH_EMAIL_FROM`, or `AELO_EMAIL_FROM`. Names alone do not establish that any provider works or that this deployment contains the intended production data. Convex CLI access to the selected project failed, so no functions or data were queried. No production data, billing, settings, or deployment was changed.

Before connecting Vercel Production to `laudable-orca-31`, verify its ownership and current data state without using customer data for tests; create a recoverable backup of the correct source and destination; confirm the server key belongs to that deployment; complete the import/parity and auth/API-key/billing/file checks; configure and test required integrations on an approved non-production target. A production switch still requires separate explicit approval.

The rescue branch also has build-time and request-time guards. A Vercel Production build, or a request to the production hostname after promoting a Preview, requires `AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT` to name the independently verified destination, both public Convex URLs to match that deployment, and a server key to be present. The known `woozy-starfish-810` test deployment is rejected. A mismatched request returns 503 before authentication or application data access. These guards are not a substitute for manually verifying that the server key belongs to the same destination or for the backup and cutover gates above. Do not set the expected deployment variable until that verification and the production promotion are approved.

## September 26, 2026 production gate

The new protected preview is Ready at `aeo-nexus-5si3sez8u-agrover12344-9741.vercel.app`, with `aelo-rescue-preview.vercel.app` assigned to it. The Vercel Production environment currently names `woozy-starfish-810` as both public Convex cloud and site deployment. That is the documented `aelo-test` development backend, so production promotion is blocked until a distinct, verified production target is configured and the source-to-destination cutover is rehearsed. Preview and Production share Razorpay secret variables; isolate test-mode payment credentials before any payment rehearsal. The September 8 and historical instructions below remain background, not authority to switch live data ownership.

### Transactional email release gate

The `aelo-test` Convex deployment `woozy-starfish-810` currently has `SITE_URL` and Google OAuth credentials, but `npx convex env list --names-only --deployment woozy-starfish-810` on September 26 showed **no** `RESEND_API_KEY`, `AELO_AUTH_EMAIL_FROM`, or `AELO_EMAIL_FROM`. Do not claim verification, password reset, welcome, first-results, or weekly messages work there yet. A verified address under an owned sending domain and a test-scoped Resend key must be configured on that Convex deployment (not just Vercel); `AELO_AUTH_EMAIL_FROM` is for verification/reset and `AELO_EMAIL_FROM` for lifecycle/alerts. Confirm `SITE_URL` points to the exact test preview origin. Keep the key out of chat, logs, Git, and `.env` files committed to the repository.

After explicit approval to deploy the email code to `aelo-test`, use a verified non-production account (the owner offered `work.ayushg@gmail.com`) and check: verification/reset link delivery and expiry, one welcome after a *new* verified account, no repeat welcome on sign-in, a complete/partial first-results message only after receipt persistence, no results-ready mail on all-failed, one weekly digest when evidence qualifies, opt-out for optional alerts, and delivery ledger states. Provider acceptance is not inbox delivery; inspect Resend delivery/bounce events. Do not trigger real billing or production customer mail. Existing accounts are not automatically backfilled with welcome mail.

## Current Convex rollout — September 8, 2026

The current branch uses Convex, not Supabase/Upstash, at runtime. **The legacy rollout below is historical and must not be executed for the current branch.** Follow `CONVEX_IMPORT_RUNBOOK.md` for data transfer and `CONVEX_RUNTIME_CHECKPOINT.md` for current verification evidence.

The user-approved `aelo-test` development deployment is `woozy-starfish-810` under team `ayush-grover`. Backend code has been pushed there and a synthetic account used for browser checks. The protected frontend preview uses stable alias `https://aelo-rescue-preview.vercel.app`, which is also the test backend's `SITE_URL`; do not point that alias or setting at production. An approved read-only Supabase export/import/parity rehearsal passed on the separate five-day preview target `deafening-robin-567`; the source was not changed. Production deployment, cutover, and production billing remain unauthorized.

1. Keep Next's public Convex cloud/site URLs and server-only `CONVEX_SERVER_KEY` bound to the same verified test deployment. Keep secrets in private environment configuration; never commit `.env` files. The ignored `.env.convex-test` is for this local-frontend/test-backend rehearsal only.
2. Configure test-only auth, engine, mail, analytics and payment settings listed in `CONVEX_IMPORT_RUNBOOK.md`. Never pull production credentials for testing. Convex's shared limiter and recurring jobs replace Upstash and Vercel schedules; do not enable duplicate workers.
3. Gemini's complete live sample and Azure OpenAI's partial live sample are recorded in `IMPLEMENTATION_PROGRESS.md`. Finish Claude/Perplexity evidence, a clean Azure four-sample repeat after the 2,000-token cap, browser authorization, failure/retry, test billing and email checks. Direct populated-workspace backend latency is measured, but the full signed-in page must be remeasured because a 7.97-second bootstrap outlier remains. Build/test success alone does not establish product fitness.
4. The read-only data-transfer rehearsal is complete on separate target `deafening-robin-567`: 337 rows, matching double-export hashes, all-table parity, and duplicate-free replay. The REST export was non-transactional, so cutover still requires stopped writers or a repeatable-read database export. Authentication account claiming, live API keys/quotas, billing replays, and evidence file storage still require staging checks before traffic changes.
5. Production cutover requires separate approval after every release gate passes. Preserve source backups plus Convex tables **and file storage**. Stop/reconcile workers and webhooks before switching ownership; do not replay historical imported jobs automatically.
6. A code rollback must preserve the matching backend contract. Do not point an older Supabase build at Convex or switch writes back to a stale source database. Reconcile any writes since cutover and authorize a recovery plan before changing data ownership. Prefer additive schema changes; no destructive schema/data rollback without a recoverable export and explicit approval.

## Historical Supabase rollout (superseded; retained for traceability)

### Status at the original checkpoint

No production deployment or production database change was made. Work is on `codex/product-rescue`. Validate it in an isolated staging project before merging or deploying.

## Required staging configuration

- Supabase URL, anonymous key, and service-role key must point to staging.
- Configure live engine keys only for engines you intend to test. Run one synthetic receipt per entitled engine and record provider model, latency, citations, and failure class.
- Set `AELO_MEASUREMENT_REGION` to a stable human-readable label such as `in-central1`; otherwise receipts explicitly store `global-unspecified`.
- Production rate limiting requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; it fails closed when they are absent.
- Cron routes require `CRON_SECRET`. Weekly email requires `RESEND_API_KEY`.
- Analytics ingestion requires `ANALYTICS_INGEST_SECRET`.
- Verify Stripe and Razorpay secrets, public key IDs, price mappings, and webhook secrets in provider test mode.
- Never enable `NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS` in production. Code now ignores it when `NODE_ENV=production`.

## Ordered rollout

1. Snapshot staging and run the sensitive-field audit queries recorded in `IMPLEMENTATION_PROGRESS.md`.
2. Apply migrations in numeric order: 025 through 036, then `20260830050607_restrict_alert_preferences.sql` and `20260830050821_version_sentiment_drift_snapshots.sql`. Migration 024 must already exist in the target because API-key routes depend on it.
3. Verify migration objects and constraints before deploying code. Do not deploy the rescued code until every migration above is present.
4. Deploy the branch to a staging preview with production-like environment variables but provider test credentials.
5. Run owner, admin, editor, viewer, and cross-workspace authorization checks. Confirm expected 401, 403, and 429 responses through both cookie and API-key access.
6. Exercise Stripe and Razorpay test-mode success, invalid signature, wrong amount/currency, replay, and database-failure cases. Confirm one immutable billing event per provider event ID.
7. Run one four-sample scan per entitled engine. Confirm raw evidence, provider citation provenance, model/region/scorer metadata, partial/all-failed states, quota accounting, and MCP compatibility.
8. Exercise scheduled-claim retries, weekly digest claim/failure storage, Actions assignment/history, and a matched follow-up cohort.
9. Run the responsive/keyboard/axe matrix with an authorized staging login at 390, 768, 1024, and 1440, plus 200% zoom. The local run covered public/auth responsiveness but not authenticated axe checks.
10. Review error rate, provider latency, quota denials, webhook failures, digest failures, and database logs before promoting the same immutable build.

## Monitoring gates

Stop promotion if any of these occur:

- a cross-workspace read/write succeeds;
- a client can change role, organization, plan, super-admin, or provider billing IDs;
- a webhook without a valid signature changes billing state, or a replay applies twice;
- a scan is shown as complete when a provider or persistence step failed;
- citations found only in generated prose are shown as provider citations;
- production falls back to per-instance rate limiting;
- scheduled or weekly jobs apply the same claim twice;
- a weekly/action verdict compares missing or mismatched model, region, mode, scorer, or contract metadata.

## Rollback strategy

Prefer code rollback first. Revert to the previous application build while leaving additive tables/columns in place; older code ignores them and this preserves support evidence.

If schema rollback is required, export affected rows first and reverse from the two timestamped alert migrations, then 036 downward:

- `20260830050821`: export sentiment snapshots, then restore the prior snapshot function only with code rollback; removing compatibility fields makes old weekly comparisons unsafe.
- `20260830050607`: retain alert preferences where practical. If rollback is unavoidable, restore client grants only after older code is active and re-audit role access.
- 036: stop activation workers, export queued/running/failed activation jobs, then remove activation claim functions and tables.
- 035: stop scan workers, allow leases to expire, export job state, then remove reliable lease fields/functions.
- 034: export action history and workspace-limit audit evidence, then restore prior functions only with matching application code.
- 033: restore older schedule mutation grants only after code rollback; doing so reopens direct-client write risk.

- 032: drop `idx_llm_scans_measurement_run`, the two added checks, then the seven measurement metadata columns. This removes comparability evidence but not scan answers.
- 031: export digest delivery/failed-notification history, then drop the claim function, delivery table, notification dedupe index, and dedupe column.
- 030: export Actions and audit history, then remove action events/index/columns and restore the earlier intervention policy only if old code still needs client writes.
- 029: export decision packet JSON, then drop `decision_packets`.
- 028: stop scan cron, then remove scheduled claim objects only after no lease is active.
- 027: stop measurement writes, export quota reservations, then remove the reservation function/table.
- 026: retain billing events unless legal/support policy permits deletion. Roll application code back before removing the atomic billing function/table.
- 025: do not restore broad client updates in production. If old code requires them, keep the immutable trigger and route safe profile changes through the server until a reviewed replacement exists.

Migrations 025–036 plus the two timestamped alert migrations were not applied locally or to production in this task. The exact SQL must be rehearsed on a disposable or staging Supabase database before approval.

## Local verification result

- `npm run lint`: passed with 0 errors; 64 warnings remain.
- `npm run typecheck`: passed.
- `npm run typecheck:mcp`: passed.
- `npm test`: 110 passed.
- `npm run build -- --webpack`: passed; 138 pages/routes generated.
- Authenticated local browser checks using the development-only bypass and explicit demo seed covered Overview and Prompts & Scans at 1440×1000 and 390×844, the receipt drawer, Sources empty state, and Actions failure state. Mobile Prompts & Scans had no horizontal overflow. The final clean-log rerun was interrupted by the browser controller, so a fresh console/network pass remains a staging gate.
- Live read-only endpoint check: homepage 200; protected visibility endpoint 401 without an API key, as expected.
- Not run: clean Supabase migration, authenticated E2E/axe, real provider liveness matrix, provider billing test-mode webhooks, production deployment.

## Ordered next cycle

1. Create an isolated staging Supabase project, apply 025–036 and both timestamped alert migrations in order, and run the role/tenant/migration checks with an authorized test owner plus viewer.
2. Configure staging Upstash, Resend, analytics signing, cron, engine, Stripe, and Razorpay test credentials; run the liveness and replay matrix before any production merge.
3. Make each Action state change plus audit event one database transaction, removing the remaining split-write failure window.
4. Move long measurement work to durable jobs with provider timeouts, bounded parallelism, crash recovery, and observable p50/p95 latency/failure metrics.
5. Run authenticated axe, keyboard, 200% zoom, Safari, and Chromium checks across the five primary jobs; fix the 67 lint warnings and the remaining performance warning as a separate cleanup.
6. Only after those gates pass, schedule a monitored canary deployment and retain the prior immutable build plus database exports for rollback.
