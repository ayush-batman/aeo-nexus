# Customer Journey Map

## Target journey

| Stage | User goal | Desired experience | Success signal |
|---|---|---|---|
| Discover | Decide whether Aelo is credible | Concrete promise with a live, clearly scoped sample | Runs free scan or starts signup with correct expectations |
| Activate | Learn something defensible about a real buyer query | 3–5 editable prompts, repeated samples, engine status, citations, confidence | First decision packet saved |
| Diagnose | Understand why visibility is weak/unstable | Source domains and competitor gaps tied to raw evidence | Opens one source gap |
| Act | Turn gap into owned work | Persisted action with owner, rationale, baseline, due state | Action moves to in progress/done |
| Prove | Determine whether the action moved results | Comparable follow-up cohort and uncertainty-aware verdict | Receipt shared/exported |
| Repeat | Know what changed this week | Digest prioritizes material change and next action | Returns weekly and reviews/assigns one item |
| Upgrade | Scale a proven loop | More prompts/cadence/engines/team/export, not hidden truth | Upgrades with plan choice preserved |

## Audited journeys

### 1. First visit and value proposition

- **Starting point:** `https://aelohq.com` or local Aelo homepage.
- **Observed steps:** headline → explanation → no-signup Gemini scan form → illustrative score panel → five-step loop → persona links → signup/pricing.
- **Good:** live product is deployed; free scan is prominent; first action requires no signup; desktop and mobile public page rendered without captured console errors.
- **Friction/dead ends:** headline is abstract; four-engine “Live” and “All systems operational” are not sourced; hard-coded scores sit next to “No mock data anywhere”; source/sample/confidence differentiation is not above the fold.
- **Likely abandonment:** a skeptical SEO lead cannot tell whether the displayed evidence is statistically stronger than competitors.
- **Recommendation:** lead with “repeated real answers + samples/confidence + source URLs”; label demo limits and examples; publish timestamped health/provenance.
- **Severity/confidence:** P0 trust issue / high.

### 2. Signup

- **Starting point:** Start free or a pricing CTA.
- **Observed/source steps:** Google or name/email/password, accept terms, create account. `/signup?plan=pro` showed no visible plan context.
- **Friction:** unassociated labels, six-character signup minimum versus eight-character reset rule, raw provider errors, paid intent not preserved.
- **Recommendation:** accessible form, one password policy, stable errors, selected-plan summary preserved through onboarding.
- **Severity/confidence:** P2 / high from source and unauthenticated browser. Submission unverified.

### 3. Login and logout

- **Observed:** unauthenticated `/dashboard` redirects to `/login`; login page renders Google/email/password, Remember me, reset link. Remember me has no implementation.
- **Unverified:** successful login, session persistence, logout, multi-tab behavior, expired session recovery.
- **Recommendation:** remove or implement Remember me; test redirect return path, cookie expiry, logout invalidation, and error announcement.
- **Severity/confidence:** P2 / high for source findings.

### 4. Password recovery

- **Source-reviewed:** forgot/reset routes exist.
- **Friction:** reset password minimum differs from signup; delivery depends on unverified email configuration.
- **Recommendation:** one shared password policy component; test expired/used/invalid links and email failure.
- **Severity/confidence:** P2 / medium-high. Runtime unverified.

### 5. Onboarding

- **Source steps:** collect brand/product context → auto-run `What is {brand}?` → show provider rows → complete and route to dashboard.
- **Friction:** generic prompt rather than a buyer shortlist question; single samples; analyzer confidence displayed as visibility; no source URLs, sample count, gap, or ranked action; completion can proceed after failed persistence.
- **Likely abandonment:** user sees a fast number but cannot defend it or know what to do.
- **Recommendation:** 3 editable high-intent prompts, explicit engine availability, four samples, decision packet, one ranked source/action gap, retryable partial state.
- **Severity/confidence:** P0 / high.

### 6. Create first workspace/product

- **Source-reviewed:** signup creates organization and default “My Brand” workspace; workspace and Products screens/routes exist.
- **Risk:** generic database-shaped “workspace/product” setup may precede customer value; service-role mutation routes do not consistently enforce roles/brand entitlement.
- **Recommendation:** call the object Brand in user-facing flow; defer product hierarchy until a customer needs multiple products; enforce owner/admin and plan limits centrally.
- **Severity/confidence:** P1 security, P2 UX / high source confidence. Runtime unverified.

### 7. Reach first meaningful result

- **Current:** onboarding provider rows with mention/sentiment/mislabeled visibility.
- **Required:** defensible per-engine score + confidence/sample count + real source domains + action gap.
- **Gap:** the canonical multi-sample response exists only in `/api/v1/scan`/MCP, not the default journey.
- **Recommendation:** make decision packet the activation event and landing screen.
- **Severity/confidence:** P0 / high.

### 8. Primary recurring task

- **Current:** scan/tracker, Insights, Interventions, Analytics, Drift, Reports, and many tools are separate destinations.
- **Friction:** no dominant repeat loop; 21+ navigation destinations; local-only Kanban state; failures can appear as empty data.
- **Recommendation:** weekly change inbox leading to one persisted action and comparable re-measurement.
- **Severity/confidence:** P1 / high.

### 9. Edit and delete data

- **Source-reviewed:** dynamic API routes and settings exist; role enforcement is inconsistent and RLS contains dangerous update policies.
- **Unverified:** confirmation design, cascading deletion, recovery, data retention, API-key revoke behavior.
- **Recommendation:** centralized RBAC; typed destructive confirmation; soft-delete/recovery where appropriate; audit log; integration tests for tenant isolation and cascades.
- **Severity/confidence:** P0/P1 security / high source confidence.

### 10. Search, filter, and sort

- **Current:** global search field is inert. Individual pages contain feature-specific controls, but end-to-end behavior was not tested.
- **Recommendation:** remove dead global search until it can search prompts, scans, sources, and actions; standardize URL-backed filters and no-result state.
- **Severity/confidence:** P1 / high.

### 11. Invite/collaborate

- **Observed in model:** roles exist (`owner/admin/editor/viewer`), but a complete invite journey was not established in inspected routes.
- **Risk:** local-only Insights board prevents collaboration; broad self-profile update may defeat roles.
- **Recommendation:** defer public collaboration launch until RLS/RBAC is fixed; then implement invite, role change, revoke, audit log, and notification tests.
- **Severity/confidence:** P0 security; feature completeness unverified.

### 12. Notifications

- **Current:** dashboard notification UI exists; fetch failures are swallowed and empty state is shown.
- **Unverified:** preferences, trigger accuracy, email delivery, dedupe, read state across sessions.
- **Recommendation:** explicit failure/stale states, event dedupe, channel preference contract, test inbox, and weekly digest as main return surface.
- **Severity/confidence:** P1 / high for masked failure.

### 13. Settings and account management

- **Current:** a very large settings page mixes account/workspace/schedules/API keys/billing concerns.
- **Risk:** high cognitive load; sensitive mutations need clearer role boundaries.
- **Recommendation:** split by user job inside one Settings area; hide owner/admin-only actions; show active plan and API-key scope plainly.
- **Severity/confidence:** P2 UX, P1 authorization / high source confidence.

### 14. Subscription, upgrade, and billing

- **Current:** pricing CTAs, Razorpay, Stripe, and custom upgrade dialog exist.
- **Friction:** plan selection is lost at signup; pricing says outcomes but tiers rely on frequency/prompt counts; dialog focus behavior is incomplete.
- **Critical risk:** client-writable plan, fail-open Razorpay, likely no-op Stripe webhook.
- **Recommendation:** stop live paid upgrade until Batch 1; server-owned price→plan mapping, signed/idempotent webhooks, accessible Radix dialog, plan intent preserved.
- **Severity/confidence:** P0 / high source confidence. Payment runtime unverified.

### 15. Failure, retry, and recovery

- **Current:** several HTTP/provider/persistence failures become empty or successful states; v1 scan omits failed engines.
- **Recommendation:** shared state contract: loading, partial, success-tracked, success-untracked, stale, empty, provider-unavailable, unauthorized, quota, retryable, fatal. Include request/run ID and safe retry.
- **Severity/confidence:** P1 / high.

### 16. Mobile usage

- **Observed:** public homepage renders at 390×844; compact navigation appears.
- **Source finding:** dashboard fixed sidebar/main padding leaves an unusable content width and collapse offset is broken.
- **Recommendation:** responsive app shell before mobile launch; test all five core destinations at 390, 768, 1024, 1440 widths and 200% zoom.
- **Severity/confidence:** P1 / high from layout code; authenticated visual runtime unverified.

### 17. Returning-user experience

- **Current inference:** user lands on a broad dashboard after full-screen onboarding gate and multiple client fetches; no clear “since last visit” priority.
- **Recommendation:** home becomes weekly decision inbox: material changes only, confidence, why it matters, assigned action, next due scan.
- **Severity/confidence:** P1 / high source confidence, user behavior unverified.

## Highest-friction transition

The biggest weakness is **signup/onboarding → first trustworthy decision**. Aelo currently optimizes for producing any score quickly; the buyer needs a reproducible, source-backed answer and one action. Repairing this transition is the core of Batch 2.

