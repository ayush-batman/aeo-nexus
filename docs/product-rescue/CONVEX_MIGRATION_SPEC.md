# Aelo Supabase-to-Convex Migration Specification

## Decision

Aelo will replace Supabase Database, Supabase Auth, RLS policies, Postgres RPCs, database-backed job claims, and Upstash rate limiting with Convex-owned equivalents.

Next.js remains the product host and compatibility edge. Existing `/api/v1` URLs, MCP behavior, Stripe and Razorpay webhook URLs, response shapes, API-key format, and public receipt URLs remain stable. The adapters at those URLs may call Convex, but they may not contain tenant authorization or business-state mutations themselves.

Production deployment and production data migration are separate approval gates. This implementation must be complete and verified against an isolated Convex development or preview deployment before any production export, import, DNS, webhook, or environment change.

## Why the migration is phased

The current application has 42 API routes and 23 tables or Postgres functions that directly depend on Supabase. A single flag-day rewrite would combine auth, tenant security, billing, scanning, scheduled work, and data conversion into one unrecoverable release.

The migration therefore keeps stable public contracts and moves ownership behind them in independently testable slices. Each slice has a Convex implementation, a compatibility adapter, parity tests, and an explicit rollback boundary.

## Target architecture

### Identity and sessions

- Use `@convex-dev/better-auth` because Aelo is a Next.js App Router application with authenticated Server Components and Route Handlers. Convex Auth's Next.js server support is still experimental, while the Better Auth Convex component provides server helpers for SSR and Route Handlers.
- Enable email/password and Google OAuth to preserve the current sign-in choices.
- Store auth component records in Convex. Store Aelo profile and tenant membership separately in application tables.
- Existing Supabase password hashes and sessions are not portable. At cutover, existing users sign in with Google again or complete a verified-email password reset. Account claiming must match a verified email to the imported profile; an unverified email may not claim an imported organization.
- Every authenticated Convex function resolves identity using the Better Auth component, then resolves an Aelo user and organization membership. No client-supplied role, organization ID, workspace ownership, plan, or billing identifier is trusted.

### Tenant model

- `users` stores the auth subject, normalized email, profile fields, onboarding state, and optional legacy Supabase UUID.
- `organizations` stores plan and provider-owned billing identifiers.
- `memberships` stores `userId`, `organizationId`, and `owner | admin | editor | viewer`.
- `workspaces` belong to organizations.
- A shared custom query/mutation/action layer injects the authenticated user and membership. This replaces RLS and must be used by every public Convex function.
- Public IDs remain UUID strings. Convex document IDs stay internal. Imported rows keep their Supabase UUID as `publicId`; new rows receive `crypto.randomUUID()`. `/api/v1`, MCP, URLs, idempotency keys, and webhook metadata continue to use public IDs.

### Data and functions

The following Supabase tables move to Convex application tables:

- organizations
- users
- workspaces
- products
- llm_scans
- forum_threads
- reddit_accounts
- content_analyses
- scheduled_scans
- prompt_library
- analytics_events
- alert_preferences
- notifications
- interventions
- action_events
- newsletter_subscribers
- public_scans
- sentiment_drift_snapshots
- competitor_attributes
- accuracy_claims
- api_keys
- billing_webhook_events
- scan_quota_reservations
- decision_packets
- weekly_digest_deliveries
- measurement_jobs
- experiments

The following Postgres RPC behavior becomes transactional Convex mutations:

- `reserve_scan_quota`
- `claim_due_scheduled_scans`
- `renew_scheduled_scan_claim`
- `claim_weekly_digest_delivery`
- `apply_billing_event`
- `create_action_with_event`
- `update_action_with_event`
- `create_workspace_with_plan_limit`
- `claim_measurement_jobs`
- `finish_measurement_job`

### External work and durable execution

- Queries and mutations never call external services.
- LLM providers, Resend, Stripe, Razorpay, crawlers, and search APIs run in Convex Node actions.
- Multi-sample measurements run through `@convex-dev/workflow` with bounded engine concurrency through `@convex-dev/workpool`.
- Scheduled scans, measurement jobs, sentiment snapshots, and weekly digests use `convex/crons.ts` and the scheduler. Lease fields remain in the data model only where they are useful for observable retries; correctness must not depend on a Vercel instance surviving.
- `@convex-dev/rate-limiter` replaces Upstash and in-memory limits for signup, public scans, `/api/v1`, and costly actions.

### Compatibility boundary

- Browser data may progressively switch to Convex queries and mutations.
- Existing Next.js Route Handlers remain during migration and call typed Convex functions.
- `/api/v1` continues to authenticate `alo_live_*` bearer keys and return current status codes and JSON shapes.
- The MCP server remains unchanged except for regression fixtures; it still calls `AELO_API_BASE`.
- Stripe and Razorpay continue posting to the existing Aelo URLs. Those handlers verify signatures using the raw request body, then call an internal Convex billing mutation using a server-held deploy credential.
- Public receipt URLs continue to use UUID public IDs.

## Measurement integrity requirements

- Failed providers never produce fabricated samples.
- Every sample records answer-provider model, region, mode, scorer version, measurement contract version, analyzer method, and analyzer model.
- Mention visibility remains successful-sample mentions divided by successful samples. Failed samples remain visible and set the run to `partial` or `all_failed`.
- Wilson intervals remain attached to observed mention counts, but UI copy must describe them as repeatability intervals rather than independent population sampling guarantees.
- Provider citations require a provider search/grounding tool or native provider source field. Links present only in generated prose remain `link_mentioned`.
- Perplexity uses a supported Sonar model. Claude and Gemini model IDs are environment-configurable and recorded on every sample.
- Comparisons require compatible prompt, engine, answer model, search mode, region, measurement mode, scorer version, analyzer model/method, contract version, and minimum sample count.

## Migration and cutover

### Development import

- Add a read-only exporter that reads an explicitly supplied Supabase connection string and writes one JSONL file per table plus a manifest containing row counts and SHA-256 hashes.
- The exporter must refuse a production-looking target unless `--allow-production-export` is passed. It never writes to Supabase.
- Add a Convex importer that loads parent tables first, resolves legacy UUIDs through `by_public_id` indexes, writes children in bounded batches, and records an import ledger.
- Import is idempotent by `publicId` and provider event key. Re-running a batch must not duplicate documents.
- Parity checks compare per-table counts, tenant membership, billing event keys, scan counts, sample counts, and stable aggregate metrics without printing customer content.

### Production cutover

Production cutover requires explicit approval and a recoverable Supabase export.

1. Deploy the verified Convex schema and functions without routing traffic.
2. Put state-changing Aelo routes into maintenance mode; reads remain available from Supabase.
3. Export Supabase and record manifest hashes and counts.
4. Import into Convex and run parity checks.
5. Switch server environment and compatibility adapters to Convex.
6. Require existing users to re-authenticate and claim by verified email.
7. Run owner/viewer, cross-tenant, API-key, billing replay, and four-engine measurement smoke tests.
8. Resume writes only after all gates pass.
9. Keep Supabase read-only for the rollback window; do not delete it during the migration release.

### Rollback

- Before writes resume, rollback is an environment switch back to Supabase.
- After Convex accepts writes, do not switch back without reconciling new Convex rows. Enter maintenance mode, export Convex, transform the delta, and apply it to a staging Supabase copy before any production rollback.
- Additive Convex tables and functions remain in place during code rollback.
- Billing webhooks must target only one active writer at a time. Disable delivery or use maintenance responses during the switch.

## Security requirements

- Every public function has argument and return validators.
- Every tenant read uses an index and checks membership.
- Every write checks role and workspace ownership on the server.
- API keys are stored only as SHA-256 hashes; only the one-time plaintext is returned on creation.
- Billing provider identifiers and plans can only change inside verified webhook mutations.
- Webhook events are unique by provider plus event ID.
- Rate-limit decisions are transactional and shared.
- No Supabase service-role key, Convex deploy key, auth secret, billing secret, or provider key enters a public environment variable.
- Development auth bypass is ignored in production.

## Acceptance gates

- No production source file imports `@supabase/ssr` or `@supabase/supabase-js` after final cleanup.
- No production runtime reads `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`.
- All 79 API routes either use Convex or are proven data-independent.
- All `/api/v1` and MCP contract tests pass unchanged for 401, 403, 409, 429, 502, and successful responses.
- Cross-organization and cross-workspace tests fail closed for every role.
- Duplicate and out-of-order Stripe and Razorpay events are safe.
- A partial provider failure cannot produce a complete run or fabricated zero.
- Real provider citations are stored only from structured evidence.
- Convex type generation, `npx convex dev --once`, app type-check, MCP type-check, lint, tests, build, browser journeys, console/network inspection, and final diff review pass.
- Checks requiring production credentials or production data are listed as unverified until explicitly authorized.

## Out of scope for the migration release

- UI redesign or color changes.
- New pricing or plan limits.
- New AI engines beyond the current entitled set.
- Deleting Supabase production resources.
- Changing the public API or MCP product surface.
