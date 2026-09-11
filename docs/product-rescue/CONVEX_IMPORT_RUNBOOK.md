# Convex data transfer

## Scope and prerequisites

The importer covers the 27 application tables in `scripts/convex/migration-transform.ts`.
It creates organization memberships from imported users and preserves public UUIDs.
Supabase authentication sessions/passwords are not imported. Existing users still need
the verified-email account claim flow when authentication is switched.

Use an isolated, empty destination with application writers, schedules, and billing
webhook processing stopped throughout the import and comparison. Imported jobs and
leases are historical records; this importer does not execute them. Reconcile any
in-flight jobs and leases before enabling future Convex workers.

Production export, data import, migrations, and deployment still require explicit
approval and verified targets. The commands below document the workflow; they do not
grant approval. Never pass credentials as command-line arguments or commit exports.

## Export and verify

Prefer setting `SUPABASE_EXPORT_DATABASE_URL` privately to the approved source. Local
sources are allowed by default; a remote export requires `--allow-production-export`.
When a direct database URL is unavailable, the exporter can instead use
`SUPABASE_EXPORT_URL` plus `SUPABASE_EXPORT_SERVICE_ROLE_KEY`. That REST path is not a
transactional snapshot and additionally requires
`--allow-nontransactional-rest-export`. Take two exports and require identical per-table
counts and hashes before importing; otherwise stop writers or obtain a direct database
URL. Never print or commit either credential.

```sh
npx tsx scripts/convex/export-supabase.ts --output tmp/convex-migration/export
npx tsx scripts/convex/import-convex.ts --input tmp/convex-migration/export --dry-run
```

The database exporter runs in a read-only, repeatable-read transaction. The explicitly
acknowledged REST fallback performs ordered, read-only pages but is non-transactional.
Both create private JSONL files and a hash/count manifest and check for absent legacy
tables. Database dates and decimal scores are converted explicitly. Newsletter
unsubscribe tokens are hashed; the future unsubscribe route must hash incoming tokens
using SHA-256 to preserve existing links.

Dry-run validates every table, hash, ordered unique public ID, count, and record-size
limit without contacting Convex. Review `missing: true` entries in the manifest;
missing core tenant/product/scan tables are rejected. Oversized or unsupported records
stop the run and require a deliberate mapping/storage decision; they are never dropped.

## Import and compare

Set `CONVEX_IMPORT_URL` to the verified deployment's `.convex.cloud` origin, never its
`.convex.site` HTTP-actions origin. Set `CONVEX_IMPORT_ADMIN_KEY` privately to that
deployment's scoped Convex deployment/admin key, or leave it unset when
`CONVEX_DEPLOY_KEY` already holds that key. Setting an environment variable with this
name on the deployment does not create an admin credential. The runner calls only
internal Convex functions through administrator authorization; there is no public
import endpoint.

```sh
npx tsx scripts/convex/import-convex.ts --input tmp/convex-migration/export
npx tsx scripts/convex/check-parity.ts --input tmp/convex-migration/export
```

A remote target also requires `--confirm-target` with its exact HTTPS origin. The
runner refuses URL credentials and redirects. It prints counts and controlled error
codes, never payloads, key hashes, or raw server errors.

All files are verified before staging. Staging is repeat-safe and rejects changed
payloads under the same manifest. Only after all files verify again does the runner
materialize parents before children in ten-record transactions. It stops on unresolved
parents, cross-workspace references, invalid destination fields, or unsafe account
re-import. Fix the cause and rerun the same command to resume through repeat-safe batches.

Comparison checks source/staging/destination counts, extra destination rows, membership
roles, shared record fields, citation URLs, mention/answer/failure counts, API-key state,
quota units, billing event keys, and action/job/delivery states. Counts and comparisons
must all pass before the run is marked complete. A completed run is only rechecked on
replay; it does not overwrite claimed accounts or later target changes.

Do not delete source data or switch traffic based solely on these checks. The remaining
runtime migration, browser journeys, billing replays, and staging cutover rehearsal are
separate release gates.

## Verified on 2026-09-06

### Runtime follow-up on September 8

- New scans and imported scans atomically write compact `scanMetrics` comparison rows. If the approved destination already contains older Convex scan rows, run internal `metricBackfill.page` repeatedly, passing its returned cursor until `done: true`, before validating action baselines. This adds derived rows without changing evidence; it is not an automatic startup task. Remote execution still requires target approval.
- Oversized combined measurement receipts use Convex file storage. Back up that storage alongside database tables. `/api/v1` and dashboard adapters authorize before resolving stored receipts. Never publish private receipt download links in public logs.
- Convex requires `BETTER_AUTH_SECRET`, `SITE_URL`, configured engine keys, and (for emails) `RESEND_API_KEY`, `AELO_AUTH_EMAIL_FROM`, `AELO_EMAIL_FROM`. Next requires matching `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` and server-only `CONVEX_SERVER_KEY`. Public scan IP hashing requires `PUBLIC_SCAN_IP_SALT`. Do not copy production keys into local tests.
- Keep local `convex dev` running for browser tests: a one-off check does not provide a durable local server. Set the local server credential in process memory; do not commit it or overwrite unrelated environment files.
- Convex owns recurring scans/digests/drift. Existing Vercel cron routes are compatibility triggers, not a second schedule. Enable one scheduler only after source workers are stopped and imported jobs reconciled.
- Imported authentication sessions/passwords remain deliberately unsupported. Verify account claiming, revoked keys, workspace roles, quota parity, webhook replay, failed/partial scans and receipt access in staging before any traffic switch.

- Synthetic JSONL → staging → materialization → comparison → interrupted/resumed run
  and completed replay, using the Convex test runtime.
- Representative records for all destination types, failed public scans, null legacy
  compatibility metadata, original evidence snapshots, and historical job/email states.
- Rollback for invalid batch records, workspace mismatch rejection, API-key organization
  rejection, protection of claimed accounts, source tampering, and bounded pagination.
- PostgreSQL driver's actual date/numeric parsers, plus a simulated SQL client test for
  absent tables and export-file permissions.
- Local anonymous Convex compilation/function push, full tests, type checks, lint, build.

### Rehearsed on September 11, 2026

- With explicit approval, two read-only REST exports were taken from the current
  Supabase source. Both contained 337 records across the 27-table contract and had
  identical per-table counts and SHA-256 hashes.
- The hash-verified export imported into fresh five-day Convex preview deployment
  `deafening-robin-567`. Independent comparison passed for every table and an immediate
  replay returned the same counts without duplicates.
- The source was not modified. The rehearsal used the documented non-transactional REST
  fallback because no direct database URL was available. A real cutover still requires
  stopped writers or a repeatable-read database export, plus a recoverable source backup.
