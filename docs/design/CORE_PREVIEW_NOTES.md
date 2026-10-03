# Aelo — five-screen local prototype

Preview: http://127.0.0.1:4180/aelo-core.html

## Scope and execution checkpoint

The user approved completing five clickable core screens locally while Figma tool access is limited. This is not the complete 66-screen route set, a production redesign, or a live product verification.

- [x] Build a shared shell and responsive styling in `aelo-core.html` and `aelo-core.css`.
- [x] Build five views and local interactions in `aelo-core.js`.
- [x] Isolate deterministic fictional evidence in `aelo-core-model.mjs`.
- [x] Verify fixture arithmetic and escaping with `aelo-core-model.test.mjs`.
- [x] Exercise desktop/mobile journeys with `aelo-core-browser-check.mjs`.
- [x] Inspect all ten desktop/mobile page screenshots and refine mobile reading order and navigation.
- [x] Add first-class Dark and Light modes, persist the local choice and inspect every core screen in both modes.

No production files, provider calls, accounts, databases, billing systems or deployment settings were changed. Both previous studies remain untouched. Local drafts and preferences live in memory and reset on reload. Only the explicitly clicked sample export writes a download.

## Design decisions

Continues the approved study 02 direction. The user is a growth lead deciding which omission deserves investigation. The interface should feel like a reviewed measurement brief, not an SEO scorecard. The approved reusable patterns are now saved in `.interface-design/system.md`.

Domain: repeated answers, buyer questions, omissions, source associations, uncertainty, compatible follow-up measurements. Color world: charcoal desk, ivory answer sheet, graphite rules, muted steel annotations, pale blue reference marks. Signature: an inspectable answer connects the headline finding to source evidence and a proposed investigation. Rejected defaults: boxed score grids, decorative charts, and improvement promises without follow-up evidence.

Shared implementation intent: border-led depth, dark base and slightly raised controls, pale evidence documents; Manrope 16px reading text and 40–64px focal headings; IBM Plex Mono for sample identifiers and supporting measurement metadata; four-pixel spacing foundation; controls at least 44px except 40px desktop preview selector. Clear keyboard focus and native dialogs, inputs and selects avoid inventing control behavior.

Component hierarchy and final refinement intent:

- Overview: the plain-language omission finding leads; the answer paper provides contrasting evidence; engine intervals remain unboxed supporting figures. The same evidence determines the headline, counts and report.
- Prompts & Scans: question list and answer reader are peers. A selected row has a narrow reference mark; editing creates a future-scan draft. On phones, a selection scrolls its answer into view.
- Sources: a ranked domain list opens a light evidence document. There are no fabricated exact citation URLs. Counts overlap by design and derive from the same fictional answers.
- Actions: rank and investigation text lead, not a board of interchangeable cards. A separate outcome note explains that completing work does not change the measured score.
- Reports & Settings: a document preview dominates; export controls are subordinate. On mobile, the evidence precedes the download action. Settings use separate sections with explicit local-only behavior.
- Dialogs and states: the same paper palette and readable body scale; native focus containment, Escape, and return focus. Complete, partial, stale, empty, loading and failed previews are selectable. Missing evidence is never rendered as a measured zero.

The interface-design guide influenced the five distinct compositions, native-control choices and evidence-first reading order. This remains a proposed pattern, not a newly installed `.interface-design/system.md`.

## Checks — 10 September 2026

Commands:

```sh
node --test docs/design/aelo-core-model.test.mjs
node docs/design/aelo-core-browser-check.mjs
node --check docs/design/aelo-core.js
```

- Seven model checks pass: totals, engine/prompt reconciliation, partial exclusion, missing evidence, Wilson intervals, source associations, safe draft display and fallback routing (some checks cover multiple cases).
- Browser checks cover all five routes in Dark and Light modes at 1440px and 390px, twenty screenshots, persisted theme preference, no horizontal overflow, mobile navigation, Escape/focus return, answer selectors, engine/question filters, safe drafts, source inspection, action status/filter, report download, workspace preferences, invitation preview and six data states.
- Partial simulation renders 32 mentions in 72 usable answers and an unavailable fourth engine, not a fabricated zero.
- No browser console errors, uncaught script errors, failed requests or HTTP errors in the completed browser run.
- Production app tests, app/MCP type checks, app lint and the production build were **not rerun**: all changes are isolated static design artifacts. These checks do not validate the live app, real scans, authentication, report delivery, billing or persistence.
- No screen mockups were added to Figma this turn; the existing Starter tool limit is still a blocker. The Figma file only has the previously recorded foundations and guide.

Screenshots: `/tmp/aelo-core-{overview,prompts,sources,actions,reports}-{dark,light}-{1440,390}.png`. The browser checker requires the local preview server and an installed Chrome; `AELO_PREVIEW_CHROME` overrides its local executable path.

Next scope, after design review: extend the approved core patterns to the remaining public, account, onboarding, secondary workspace and admin routes. Do not call those complete based on these five screens.
