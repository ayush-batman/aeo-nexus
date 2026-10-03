# Open Questions, Assumptions, and Verification Gaps

## Evidence labels used in this audit

- **Observed:** directly seen in repository code, command output, or browser behavior.
- **Inference:** likely consequence of observed implementation; requires a targeted test to confirm.
- **Assumption:** product choice used to make the roadmap concrete; owner validation required.
- **Unverified:** could not be tested safely with current access or environment.

## Assumptions

| ID | Assumption | Why used | How to validate |
|---|---|---|---|
| A1 | The initial beachhead is an India-based B2B SaaS Head of Growth/SEO; founder/CMO is the buyer. | Best fit with India positioning, ₹ pricing, prompt/source workflow, and defensibility message. | Interview 10–20 active prospects; require at least 7 to share the same weekly reporting/action loop. |
| A2 | Four samples per prompt/engine is the initial minimum, not a permanent statistical standard. | Existing API defaults to four and can express agreement, but no calibration study exists. | Run repeatability study by engine/prompt class; select sample count from target confidence/error bounds. |
| A3 | The public free scan remains single-engine and may be single-sample if clearly labeled as a teaser. | It is an effective low-friction acquisition wedge and already discloses one sample in the receipt. | Test conversion from honest teaser to multi-sample decision packet. |
| A4 | Incremental repair is safer than a rewrite. | Core provider, API, MCP, Supabase, and UI foundations exist; the failures are boundary and consistency failures. | Revisit only if Batch 1 cannot create a single safe measurement/service boundary without pervasive replacement. |

## Open product questions

1. Which persona has already paid, retained, or repeatedly used the product?
2. What is the exact paid activation definition today, and how many users reach it?
3. Which 3–5 high-intent prompt templates reliably reveal a useful source/action gap for the beachhead?
4. Does the buyer value per-engine scores, a blended score, or a decision packet more during weekly reporting?
5. What evidence is sufficient to call an intervention causal rather than correlated?
6. Are agencies a core market now or a later channel? Supporting both materially expands tenancy, permissions, exports, and white-label needs.
7. Is “Google AI Overview” actually live and supported? Marketing includes it in the loop, while the supplied one-line promise names four assistants.
8. Should free users receive four samples on Gemini, or should cost be exchanged for signup/verified email first?
9. What is the contractual meaning of “confidence”—sampling agreement, classifier confidence, citation provenance, or a calibrated statistical interval?
10. Which outcomes justify ₹4,999 versus the $29 Otterly floor and the $60 Listable price?

## Open technical and operational questions

| Question | Status | Required verification |
|---|---|---|
| Is migration `024_create_api_keys` applied in production? | Unverified | Compare production migration ledger in a read-only admin session; do not infer from repo. |
| Which provider keys are live in production? | Unverified | Run one controlled synthetic scan per entitled engine in staging; record request, provider/model, latency, error class, and grounded-citation capability. |
| Is `RESEND_API_KEY` configured and are email domains verified? | Unverified | Staging delivery to a test mailbox plus Resend event verification. |
| Are `CRON_SECRET`, Stripe, and Razorpay secrets present and rotated? | Unverified | Configuration audit that reports presence/version only, never values. |
| Are all migrations applied in order to a clean database? | Unverified | Provision empty test project, apply schema/migrations, run RLS suite. |
| Does the broad self-update/org-update RLS vulnerability exist in production? | High-confidence inference | Attempt safe forbidden column updates in an isolated test tenant, not production. |
| Does Stripe webhook update plans? | High-confidence inference of failure | Signed staging fixture; assert affected row and response. |
| Is every citation shown in product provider-grounded? | Observed false for current plain-generation paths | Capture raw provider response metadata and compare displayed citations. |
| What process owns port 3000 locally? | Observed mismatch | `localhost:3000` served “heyclicky”; Aelo started at 3001 because 3000 was occupied. Decide and document port ownership. |
| Why are Next/SWC native bindings missing? | Observed | Clean dependency install after disk recovery; compare lockfile, architecture, and installed optional package. |
| Is the disk-capacity issue recurring in CI/deploy? | Local only | Add disk monitoring/cleanup runbook; CI runners likely differ. |

## Journeys not verified

- Email/password signup submission and email confirmation.
- Google OAuth.
- Password reset email delivery and final reset.
- Authenticated onboarding and first real project creation.
- Authenticated dashboard, prompt management, scans, search/filter/sort, settings, collaboration, deletion, and return visit.
- Real engine-by-engine scans in production or staging.
- Scheduled scans and cron execution.
- API-key UI creation/revocation and live `/api/v1`/MCP calls.
- Stripe or Razorpay checkout and webhook completion.
- Notification and weekly digest delivery.
- Production database policies, migration state, monitoring, analytics, customer retention, and support operations.
- Competitor authenticated products and their true sampling/statistical methods.

## Inputs requested from the owner

1. A non-production login with a disposable tenant and payment test mode.
2. Read-only staging configuration status (presence only) and migration ledger.
3. Funnel data: homepage → signup → onboarding → first decision packet → week-2 return → paid.
4. Five recent customer/prospect interviews, support threads, or sales call notes.
5. A decision on the beachhead persona and whether agencies are in or deferred.
6. The definition and calibration target for “confidence.”

