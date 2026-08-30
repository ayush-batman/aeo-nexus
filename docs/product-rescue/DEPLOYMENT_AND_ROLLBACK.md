# Aelo product-rescue deployment and rollback

## Current status

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
