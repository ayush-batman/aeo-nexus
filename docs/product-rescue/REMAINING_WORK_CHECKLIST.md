# Aelo remaining-work checklist

Updated: September 12, 2026

This list starts from the current `codex/product-rescue` workspace. The Convex runtime migration, measurement-trust rules, authorization hardening, migration rehearsal, and first visual-system pass are complete in code. Aelo is a tested release candidate, not yet a production-verified release.

## 1. Finish the current release candidate

- [x] Review the current UI and dashboard-summary diff for scope, measurement wording, accessibility, and accidental regressions.
- [x] Re-run the focused dashboard/measurement tests after that review.
- [x] Run the code release gates: 174 Node tests, 50 Convex tests, lint, app type-check, MCP type-check, the 142-route production build, public production-server browser checks, and dependency audit. Diff hygiene and the final scoped commit are recorded at handoff.
- [x] Commit the current UI pass as a scoped, reversible commit.
- [x] Redeploy the protected non-production preview so it contains the latest zero-warning and visual changes. The stable alias now points to the Ready deployment created on September 12, 2026.

## 2. Prove the real customer journey in staging

- [ ] Use a synthetic non-production account to retest: homepage/sign-up → onboarding → 3–5 editable buyer prompts → multi-sample scan → decision packet.
  - Rechecked through brand save and three editable prompts. With providers absent, the packet request failed visibly and persisted no fabricated result; a successful multi-sample packet still needs an approved test provider key.
- [ ] Verify all five primary jobs with real test data: Overview, Prompts & Scans, Sources, Actions, and Reports & Settings.
- [ ] Verify complete, partial, all-failed, stale, empty, loading, retry, and permission-denied states.
- [x] Confirm public and signed-in browser console and same-origin network requests are clean after the latest UI changes at 1440×1000 and 390×844. The signed-in sweep covered all six primary destinations with a fresh synthetic account.
- [x] Check public keyboard skip navigation, motion controls, reduced motion, and automated accessibility. Lighthouse accessibility now scores 100 on the production-build homepage; the signed-in WCAG A/AA matrix is also clean across all six primary pages at desktop and mobile widths.
- [x] Finish signed-in keyboard/focus-return checks and the 200%-zoom equivalent layout pass. The dashboard skip link, main-content focus, tools-drawer focus trap, Escape close, focus return, and a 720 CSS-pixel viewport all passed with no overflow.
- [x] Check Chromium at 390, 768, 1024, and 1440 pixel widths.
- [ ] Check Safari at 390, 768, 1024, and 1440 pixel widths. The first automation attempt was blocked because the Mac was locked.
- [x] Add `npm run test:e2e` for every primary public page at desktop/mobile widths, motion controls, reduced motion, keyboard skip navigation, failed requests, error overlays, and horizontal overflow.

## 3. Finish live integration proof

- [x] Gemini: complete four-sample live run recorded.
- [ ] Azure OpenAI: repeat a clean four-sample run with the final 2,000-token cap; the recorded run completed only 3/4 samples.
- [ ] Anthropic Claude: run a real four-sample measurement and verify structured citation evidence, timeouts, partial failure, and receipt storage.
- [ ] Perplexity: run the same live measurement and evidence checks.
- [ ] Google OAuth: test success, cancellation, invalid callback, existing-account linking, and sign-out with non-production credentials.
- [ ] Resend email: test verification, password reset, contact delivery, weekly digest, provider failure, and duplicate protection.
- [ ] Stripe test mode: test success, invalid signature, wrong amount/currency, replay, cancellation, and database failure.
- [ ] Razorpay test mode: run the equivalent signature, amount, replay, cancellation, and failure checks.
- [ ] Exercise a real 429 quota/rate-limit response against the test backend, not only the automated limiter tests.

## 4. Solve and prove latency

- [x] Remove the duplicate Overview workspace lookup and extra Next.js-to-Convex summary hop.
- [x] Queue independent provider samples together under the four-job concurrency cap.
- [ ] Measure signed-in page-load and scan latency in a production-like preview using p50 and p95, not three local samples.
- [ ] Trace the remaining first-login/auth bridge delay and the 7.97-second backend outlier.
- [ ] Decide how to reduce India-to-US-East distance for the beachhead audience without splitting the source of truth.
- [ ] Add visible latency and failure monitoring for auth, dashboard reads, each model provider, scan persistence, webhooks, and email jobs.
- [ ] Set release budgets for first useful dashboard paint, warm navigation, scan start, per-provider completion, and complete decision packet.
- [ ] Re-run the measurements under representative workspace size and bounded concurrent load.

## 5. Complete the visual system without weakening trust

- [x] Establish Aelo's dark/light evidence-instrument direction and shared product tokens.
- [x] Revamp the homepage, Features page, shared marketing chrome, and Overview focal evidence view.
- [x] Carry the marketing direction through Product, Pricing, Methodology, About, and all four solution pages. Highest-traffic editorial pages remain a later consistency pass.
- [x] Carry the product direction through onboarding and the five primary jobs in code, including restrained state color and evidence-first wording. Rechecking every state with signed-in test data remains in section 2.
- [ ] Audit secondary dashboard tools so they feel related to Aelo instead of older template screens; merge or hide tools that do not support a primary job.
- [x] Tighten the public, onboarding, Overview, Prompts & Scans, Sources, Actions, and Report copy around evidence, denominator, confidence, and the next investigation—without guaranteed-lift claims.
- [x] Perform the primary motion pass: one controllable sampled-answer sequence, no decorative background motion, and a static reduced-motion mode.
- [ ] Recheck image, font, script, and animation cost against the latency budgets.

### SceneAI reference decision

SceneAI is useful as a reference for decisive art direction, strong visual focal points, curated pacing, and high-quality preview framing. Aelo should not copy its pink/orange gradients, image-first gallery structure, or ambient animated backgrounds: those would compete with evidence and add avoidable load.

The Aelo adaptation is one memorable evidence sequence: a buyer question separates into repeated answers, provider citations remain visibly attached to each sample, and the results settle into a confidence range. It can use restrained transform/opacity motion and the existing paper/graphite/reference-blue system. The answer and its provenance stay the visual hero.

## 6. Complete the production data cutover

- [x] Rehearse read-only Supabase export → Convex import → independent parity → duplicate-free replay on a separate test target (337 rows).
- [ ] Choose a production cutover window and stop or reconcile writers, workers, schedules, and webhooks.
- [ ] Take a recoverable source database backup plus file-storage inventory/export.
- [ ] Use a repeatable-read database export, or prove that stopped writers make the final double-export identical.
- [ ] Import to the approved production Convex target and run independent table, relationship, count, hash, and idempotence checks.
- [ ] Verify account claiming because Supabase password/session records are deliberately not imported.
- [ ] Verify live API keys, scopes, revocation, quotas, billing event ownership, receipt access, and stored evidence files after import.
- [ ] Reconcile writes and provider events at the cutover boundary before switching traffic.

## 7. Production release and follow-up

- [ ] Review the complete migration and release diff as a skeptical security/data review.
- [ ] Confirm production secrets and origins are bound to one verified Convex deployment; keep the development auth bypass disabled.
- [ ] Promote one immutable build only after every staging gate above passes and the user explicitly approves production deployment.
- [ ] Run a monitored canary and stop on any cross-workspace access, false-complete scan, fabricated citation, duplicated job, invalid billing mutation, or incompatible comparison.
- [ ] Verify the core journey, API/MCP 401/403/429 behavior, billing, email, and live providers immediately after promotion.
- [ ] Monitor errors, latency, provider failure rate, quota denials, webhook replays, email failures, and scan persistence during the canary window.
- [ ] Keep the prior build, source backup, Convex tables, and file storage available for rollback; reconcile new writes before any ownership reversal.

## Inputs genuinely required from the user

- [ ] Approved non-production credentials for Claude, Perplexity, Resend, Google OAuth, Stripe, and Razorpay, plus approval for any billed provider probes.
- [ ] Explicit approval and the exact target before a production data import or production deployment.
- [ ] A production cutover window once staging is fully signed off.
