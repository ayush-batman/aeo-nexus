# Runtime migration checkpoint — 2026-09-08

This is an implementation checkpoint, **not a completion claim**. No production deployment or data transfer has been authorized or performed.

## September 8 cloud test continuation — latest status

The user supplied the `aelo-test` development target in response to the test-deployment approval request. Verified the empty `woozy-starfish-810` deployment under `ayush-grover`; deployed the migration and subsequent auth latency fixes there. Production remains untouched. Only a synthetic `@example.test` account was seeded; no source export/import or production credentials were used.

- Separate ignored `.env.convex-test` holds the test public endpoints and a development-only deploy key named `aelo-test-local-checks`. The Next server receives that key in memory as `CONVEX_SERVER_KEY`; do not print or commit it. The CLI rewrote `.env.local` public endpoint fields during pushes; those were restored to the original anonymous-local target.
- Configured test-only `BETTER_AUTH_SECRET`, `PUBLIC_SCAN_IP_SALT`, and localhost `SITE_URL`. AI, email, OAuth and payment keys have not been configured by this session. Asked the user to add test AI keys through the test dashboard, not chat.
- Authenticated cloud-backed login now works. Initial login-to-usable-onboarding measurement was 9,696 ms; repeats after auth changes were 4,495 and 3,546 ms. These are small-sample local-frontend/US-East-backend observations, not production p95 or scan-completion claims.
- Before changes: onboarding context 3,991 ms, workspace list 3,359 ms, dashboard stats 6,968 ms (one successful probe each). After changes: context 3,545 / 1,509 / 1,807 ms; workspaces 1,501 / 1,494 / 1,716 ms; dashboard 4,758 / 4,378 / 4,579 ms. All nine returned 200. A longer earlier baseline run stalled and returned one workspace 503; it was stopped, not counted as a passing run. The browser checker now has bounded fetches and an overall watchdog.
- Existing-account resolution now reads first, provisions only for the structured `profile_not_provisioned` error, and reuses the current request token. Authorization errors/outages do not trigger writes. No cross-request authorization cache was introduced.
- Auth's shared limit hashes keys using Web Crypto inside the HTTP action, eliminating the extra Node action hop while retaining the same SHA-256 keys, namespace, limits and atomic counter. The legacy internal action delegates to the same helper. Regression coverage checks the mixed old/new path and exact hash compatibility.
- Fresh gates: 141 Node tests and 43 Convex tests pass; app and MCP type checks pass; production webpack build passes including the final onboarding changes. Full lint: zero errors, 63 existing warnings (two temporary test-only warnings were corrected and the focused lint recheck passed). Final `git diff --check` and script syntax checks pass. Reviewed the auth-latency batch against the Convex security/performance checklist; the complete migration diff still needs review.
- Browser: desktop login/onboarding renders; mobile onboarding recheck at 390px has no horizontal overflow, including after excluding resize animations. Fixed progress marker/card layout; removed unsupported timing and automatic-tracking promises. A real pre-context submission bug was found: Continue silently returned before `workspaceId` loaded. It is now disabled with a loading label until ready; browser regression intentionally delays the real context request and checks that state before releasing it. Saved the synthetic brand, verified three editable prompts, and observed a visible 503 when no engine is configured; no measurement was fabricated. No page errors were observed through those steps. Login timing varied (a later run reached 13,572 ms), so do not present the earlier improvements as a reliable percentile or SLA.
- The combined browser script failed at its API-key stage due a test-only Response API typo; corrected it and added cleanup of that test's keys. The browser-launch retry subsequently timed out, so API authorization was verified independently through real HTTP requests to the local app with the same synthetic cloud-backed account: no key 401, valid read key 200, scan with read-only key 403, revoked key 401. All keys named `Synthetic browser verification` created by the test were revoked, including the interrupted run's key. This is an HTTP authorization check, not a browser-completion claim. Live 429 remains covered by automated limiter tests rather than a cloud load test.

Still open: complete dashboard/remaining five-job browser rehearsal, complete migration diff review, representative populated-workspace latency and load checks, real provider evidence/receipt/storage, test email/OAuth/payments, and approved source-export/import/parity rehearsal. Four-second empty dashboard reads are improved but not an acceptable final latency target. Repeated token reads and duplicated raw-scan dashboard reads remain candidates; do not claim latency solved. The immediate external input for actual scan verification is a test `GEMINI_API_KEY` (the synthetic free workspace is entitled to Gemini); other engines need test keys plus an authorized entitled test organization.

The older blocked-local account below is historical, not the latest cloud result.

## September 8 continuation — supersedes the older lists below

The runtime ports below are implemented, not merely planned:

- Forum discovery/drafts/post-to-action transitions, experiments, admin, public scan receipts, newsletter, attribution and explicit India-index publications now use scoped Convex functions.
- Content drafts, schema, originality review, prompt discovery, brand enrichment, technical/content/help-center audits and provider calls moved to Convex Node actions. Removed fabricated fallback scores, invented question demand and unsupported citation weighting. HTML audit scores are explicitly editorial checks, not visibility measurements.
- Weekly digest/drift jobs, notifications and retry-safe email outbox run in Convex. Delivery rechecks membership/preferences, freezes sender and payload, requires a provider ID and stops ambiguous retries before the provider’s deduplication window expires.
- Multi-sample receipts preserve full evidence in file storage when too large for a document. Authorized server adapters retrieve the full receipt. Compact `scanMetrics` rows support action comparisons without loading hundreds of raw answers; imports create them atomically, and `metricBackfill.page` is an explicit resumable repair for earlier Convex rows.
- Public receipts use scheduled timeout/expiry state changes. Raw scan pages are bounded to five potentially large records per database call.
- Sentiment negation/alias handling, tied aggregate sentiment, mentioned-only positions, exact-case prompt cohorts and latest-earlier alert selection corrected with regression tests. Analyzer prompt version bumped to prevent incompatible historical comparisons.
- Removed Supabase/Upstash runtime packages and obsolete clients; historical SQL and approved export/import tools remain. No authentication-password/session transfer is implied.
- Next upgraded to 16.3.4 and compatible dependency security patches applied. `npm audit` reports zero known vulnerabilities. Framework-generated edits to project instructions are disabled; existing project instructions remain intact.

Verification history: full Node suite and 42 Convex tests passed earlier in this continuation; lint has zero errors (63 warnings); app and MCP type checks passed; production webpack build passed. Local anonymous Convex functions compile. **Later verification did not pass:** a repeat parallel Convex run had five failing tests, initially timing out at five seconds, followed by teardown errors; a one-worker rerun also timed out and was stopped. No timeouts, auth checks or test assertions were relaxed. The Node suite passed before that repeat Convex run. The final app type-check retry stalled for more than five minutes and was stopped; the subsequent build in that sequence was not reached. Therefore the latest edits do not have a fresh complete type/build sign-off, despite earlier successful checks.

Browser outcome: homepage and login render, but authenticated navigation is **blocked**. A synthetic verified local Better Auth account was created only in the anonymous localhost backend. Both browser checkers reached login; the independent Playwright check recorded HTTP 500 on `/api/auth/get-session` and `/api/auth/sign-in/email`, with the page showing “Unable to sign in.” Backend logs identify `abuse:check` exceeding Convex’s one-second mutation execution budget through `authActions:consume`. Unrelated empty scheduled queries also exceeded that budget and the host showed severe CPU/memory pressure. This is evidence of a constrained local environment, **not proof that application performance is acceptable**. Authenticated desktop/mobile journeys, console/network checks beyond login, real AI, email, OAuth and billing success remain unsigned-off staging gates. Test credentials are synthetic; no production source, secret or billing was used. Local servers and stalled checks were stopped to reduce load.

Remaining gates: complete desktop/mobile authenticated browser checks, obtain a clean repeat Convex suite on an adequately resourced host, review the complete migration diff, and rehearse live source export/import/parity plus provider/payment/email flows in a verified non-production environment. Production cutover still requires explicit approval. Large receipt responses now use bounded JSON stream chunks without changing fields, with byte-exact regression coverage; actual hosting streaming/payload behavior still requires staging verification. The final full migration diff review is not complete; `git diff --check` passed.

## Historical September 6 snapshot (retained for traceability)

## Implemented in the current working tree

- Better Auth sessions, verified-email tenant binding, onboarding/profile/workspace/product/prompt/schedule access.
- Durable multi-sample measurement workflows with transactional quotas, stable replay IDs, per-sample claims, explicit failures, actual model/search/analyzer metadata, and stored evidence.
- All `/api/v1` adapters, scoped API keys, shared key throttles, revocation and role rechecks, asynchronous scan status.
- Stripe/Razorpay calls and signature verification in Convex actions; atomic event ledger, delayed-event protection, cross-provider cancellation protection, admin-only checkout.
- Settings/profile/team reads, scoped writes, alert preferences, notifications; Convex live heads for Overview/Scans (Forum pending).
- Background accuracy/positioning jobs: preserve old evidence on provider failure; require real source quotations for verified claims; typed paginated reads.
- Shared Convex rate limits for existing protected Next endpoints; analytics ingest/install tokens and paginated traffic summaries.
- Buyer-prompt activation bundles charge one quota unit; frontend reconnects to pending packets; schedules run under Convex recurrence with stable scheduled-time IDs.
- Measurement alerts use saved samples and complete comparison metadata. No fresh provider call is made while evaluating alerts.
- Actions CRUD/history/owner binding and asynchronous follow-up measurements in Convex; backend comparisons reject changed sampling proportions. Frontend action-follow-up polling still pending.
- Reports/insights/citations reads moved; recommendation wording now describes observed samples, not all AI answers.

## Verification so far

- Local Convex code generation/type checking passed repeatedly, most recently after action follow-up jobs.
- Nine focused Convex tests passed together: billing (3), activation (2), settings/alerts (1), measurement workflow (3).
- Earlier domain/API-key/import and measurement tests passed; the complete current suite has NOT been rerun.
- Full lint, app/MCP checks, production build and browser journeys remain release gates; older source-contract tests need architectural updates with equivalent behavioral coverage.

## Remaining implementation (do not stop after this checkpoint)

1. Forum CRUD/discovery/suggestions/citation map + live hook; preserve posted-thread action history atomically, enforce role/quotas, retain drafts during rediscovery.
2. Public scans/receipt URLs, newsletter/attribution, India index, experiments, admin/usage and remaining entitlements calls.
3. Weekly digest, sentiment snapshots and notifications/email in Convex; preserve idempotent recipient delivery, pagination and full cohort compatibility.
4. Move remaining non-DB external AI/crawl/email calls from Next to Convex Node actions; remove Supabase and Upstash runtime dependencies only after all consumers move.
5. Fix long-running scan/Actions frontend polling; finish public-ID-only query boundaries and raw-evidence/receipt document-size handling.
6. Regression checks for new action transitions, analysis failures, ingestion protection, scoped records, retries and metrics. Fix obsolete tests, not quality rules.
7. Required full gates and local browser verification. No production testing, migrations or deployment.

## Known follow-up risks

- Measurement receipts repeat raw citation references across samples/engine aggregates; large receipts may exceed the Convex document size. Raw evidence must remain retrievable without fabricating truncation as complete evidence.
- Current action snapshot/finish mutations read up to 8 samples per prompt/engine; large batches need evidence-summary storage or paginated action reads to stay within read limits.
- Some old UI/source-map text makes unsupported source-weighting claims; remove these while porting their data paths.
- Runtime Next internal adapters need `CONVEX_SERVER_KEY` on the matching deployment; only anonymous local configuration may be set without deployment approval.
