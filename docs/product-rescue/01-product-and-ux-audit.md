# Product and UX Audit

## Product model

**Primary persona (inference):** Head of Growth/SEO at an India-based B2B SaaS company, accountable for weekly visibility and pipeline reporting. Founder/CMO is the economic buyer. Agencies are a later channel, not a simultaneous default persona.

**Job to be done:** “When buyers ask AI for a shortlist, show me—defensibly—whether we appear, which sources shape the answer, what action is worth taking next, and whether it moved the result.”

**Activation event:** first decision packet: 3–5 high-intent prompts × entitled engines × four samples, with mention rate, confidence/sample count, engine status, exact source gap, and one ranked action.

**Aha moment:** a reproducible surprise, such as “Aelo appears in 1/4 Gemini answers while a competitor appears in 4/4, and this third-party page is cited.”

**Repeat loop:** weekly digest → review one material change/gap → assign and complete action → comparable re-sample → share receipt.

**Retention mechanism:** accumulated prompt baselines, source history, and intervention outcomes. **Upgrade trigger:** automation and operating scale—not withholding the first trustworthy result.

## Current product shape versus user mental model

The interface reflects implementation modules: Battle Arena, Question Mine, Prompt Research, Content Studio, Forum Hub, Playbook, Experiments, Analytics, Drift, Crawlers, Attribution, Accuracy, Interventions, Reports, Products, and Settings. The user’s mental model is much smaller:

1. What changed?
2. Where am I absent or unstable?
3. Which sources shape the answer?
4. What should we do?
5. Did it work, and can I prove it?

The recommended top-level navigation is **Overview**, **Prompts & Scans**, **Sources**, **Actions**, and **Reports & Settings**. Experimental or narrow tools should become contextual drill-downs or labs.

## Design direction assessment

- **Domain:** measurement instruments, samples, evidence, receipts, source trails, uncertainty, intervention, drift.
- **Natural color world:** black instrument panel, paper/ivory receipt, graphite, muted signal green, warning amber, failure red.
- **Signature to preserve:** the receipt behind every number, visibly carrying engine, timestamp, sample count, confidence, and source provenance.
- **Defaults to reject:** generic rainbow metric cards; a 20-link SaaS sidebar; a blended score without its measurement context.
- **Direction:** a calm, evidence-dense instrument. One ivory action accent; semantic colors only for real states; hierarchy led by the decision packet and source trail.

## Findings

| Priority | Route/screen | Current behavior and evidence | Problem | Recommended behavior | Impact | Effort | Confidence |
|---|---|---|---|---|---|---|---|
| P0 | Homepage | Hard-coded engine scores at `app/(marketing)/page.tsx:98-102` sit beside “No mock data anywhere” at `:116-118`; observed locally and live. | Direct contradiction of the honesty promise. | Label as illustrative, or render a real timestamped public receipt with sample count and link. | Trust/conversion | S | High |
| P0 | Onboarding | Analyzer `confidence`, defaulting to 0.6, becomes a displayed “visibility” score (`onboarding/page.tsx:183-189,476-479`). | Classification confidence is not visibility. | Keep confidence separate; derive visibility from repeated mentions and show `n` and failures. | Core correctness | M | High |
| P0 | Onboarding/tracker/dashboard | Onboarding auto-runs one `What is {brand}?`; tracker defaults to Gemini and one call/engine; dashboard scores lack sample context. | The promised defensible result is not the primary experience. | Canonical multi-sample decision packet everywhere. | Activation/trust | L | High |
| P0 | Intervention receipt | Latest single baseline is compared with one new call. | Random model variation can become an “improved” claim. | Comparable sample cohorts with same prompt, engine, model/version, region, window, and minimum sample count. | Trust/retention | L | High |
| P1 | Dashboard shell | Fixed `w-60` sidebar and `pl-60` layout; collapse does not change main offset (`layout.tsx:14-20`; `sidebar.tsx:244-249`). | Dashboard is structurally unusable on small screens. | Mobile top bar + overlay drawer; desktop grid with one shared sidebar state. | Usability | M | High |
| P1 | Dashboard navigation | About 21–22 destinations across six groups (`sidebar.tsx:44-97`). | Core loop is hidden; high cognitive load. | Five job-based destinations; progressive disclosure. | Activation/retention | M | High |
| P1 | Onboarding | First question is generic brand awareness and result lacks source gap/action. | Fast but weak first value. | Generate 3 editable high-intent prompts and return one decision packet with ranked next action. | Activation | M | High |
| P1 | Insights/actions | Insights board state is `localStorage`; Insights and Interventions are separate (`components/dashboard/insights-board.tsx:39-51`). | Not shared, durable, or connected to proof. | One persisted team Actions queue with owner, state, baseline, follow-up, evidence. | Retention/collaboration | L | High |
| P1 | Dashboard header | Search input has no behavior (`components/dashboard/header.tsx:169-175`). | Dead global control creates false affordance. | Remove until functional, or search prompts/scans/sources/actions with results and empty/error states. | Credibility | S/M | High |
| P1 | Loading | Client onboarding gate blocks the app behind a full-screen spinner; pages/sidebar then fetch again; no route `loading.tsx`. | Serial blank-screen waterfall and repeated requests. | Server-side auth/onboarding decision; parallel server fetches; Suspense and route skeletons; shared request cache. | Speed/reliability | L | High |
| P1 | Error states | Notifications and analytics swallow failures and render valid-looking empty data; onboarding completes even if persistence fails. | Outages look like zero results or success. | Distinct loading, empty, error, partial, stale states with retry and last-known data. | Trust/recovery | M | High |
| P1 | Forms | Repo scan found many visual `<label>` elements without programmatic association; auth and scan forms are examples. | Screen-reader and click-target failure. | `label htmlFor` + matching ids, described errors, `aria-live`, stable focus. | Accessibility | M | High |
| P1 | Interactive elements | Clickable `div` metric cards and notification rows; custom upgrade dialog lacks focus management despite Radix being installed. | Keyboard/focus behavior is broken. | Semantic button/link elements; Radix Dialog; focus trap/restore; Escape and backdrop behavior. | Accessibility | M | High |
| P1 | Controls | Shared buttons can be 28–36px; icon buttons often use tiny padding. | Below 44px mobile target and 40px dense desktop minimum. | Expand hit areas without visually bloating controls. | Mobile/a11y | S | High |
| P1 | Trust/status | Homepage says four engines “Live”; footer always says “All systems operational”; demo only calls Gemini. | Unverified health claims can mislead. | Real timestamped capability/health state, or remove operational claims. | Trust | M | High |
| P1 | Contrast | `--text-tertiary:#52525B` and `--text-ghost:#3F3F46` on black are used for meaningful instructions/status. | Likely below WCAG 4.5:1 normal-text contrast. | Raise muted normal text to a verified passing token; reserve lower contrast for decorative/disabled content. | Accessibility | S | High |
| P2 | Motion | Smooth scrolling and animated UI have no reduced-motion treatment. | Motion-sensitive users cannot opt out. | Global reduced-motion override plus component variants. | Accessibility | S | High |
| P2 | Visual system | One-ivory-accent intent drifts into old indigo, six metric accents, rainbow charts, and hard-coded utilities. | Weakens hierarchy and instrument identity. | Semantic chart/status tokens; one action accent; provider colors only for provider identity. | Clarity/brand | M | High |
| P2 | Hero | “The standard for artificial intelligence visibility” asserts category leadership; strongest concrete value is below. | Abstract and hard to substantiate. | Lead with repeated real answers, samples/confidence, source URLs, and action. | Conversion | S | High |
| P2 | Signup | Pricing CTA includes `?plan=`, but signup does not preserve/display it. | High-intent paid selection is lost. | Persist selected plan through signup/onboarding and confirm before checkout. | Conversion | S | High |
| P2 | Auth | Remember-me is inert; signup/reset password minimum differs; raw provider errors leak into UI. | Misleading control and inconsistent recovery. | Remove/implement remember-me, one password policy, stable actionable error mapping. | Conversion/support | S/M | High |
| P2 | Rendering | Whole static marketing page is a client component; analytics statically loads heavy chart/motion libraries. | Unnecessary hydration and bundle cost. | Server-render marketing shell; isolate client widgets; lazy-load heavy analytics views. | Performance | M | High |

## Observed browser behavior

- `https://aelohq.com` is deployed and returned the expected Aelo homepage with no captured console warning/error on the observed load.
- `http://localhost:3000` served an unrelated “heyclicky” site. Aelo started on `http://localhost:3001` because port 3000 was occupied.
- Aelo homepage rendered at desktop and 390×844. Mobile navigation reduced to logo, Start free, and Menu; no overlap was observed above the fold.
- Visiting `/dashboard` without authentication redirected to `/login`.
- `/signup?plan=pro` rendered the generic signup form with no visible selected-plan context.
- Authenticated product pages were not browser-tested because no non-production login was supplied.

## Product decisions

### Preserve

- No-signup free scan and public share receipt.
- Honest zero/provider-unavailable principle.
- Evidence drawer/receipt affordance behind core numbers.
- India/₹ wedge and Razorpay option.

### Defer

- New engines, crawler analytics, white-label agency breadth, more content-generation tools, autonomous agents, and superficial dashboard polish.

### Validate with users

- Beachhead persona, four-sample minimum, weekly decision packet format, intervention evidence standard, and upgrade trigger.

