# Aelo design study 02 — not an approved design system

## What failed in round one

The layout was a familiar sidebar plus a boxed score. Nearly every secondary item was tiny and muted. The voice included decorative slogans ("Every answer leaves a mark", "Earn a place in the comparison") where customers needed findings and instructions. The sample bars looked distinctive in isolation but did not make the page insightful.

## Working intent

Audience: a founder or growth lead deciding what deserves attention after a scan. Single job: inspect an omission, understand the supporting source evidence, and choose an investigation. Feeling: an analyst's reviewed brief, direct and composed, not a gamified SEO dashboard.

Domain: buyer questions, repeated answers, omissions, competing names, citation trails, uncertain estimates, matched follow-up measurements.

Colour world: dark reading desk, pale document, graphite annotation, blue-grey reference marks, white editorial type, muted steel rules. Tokens: night #171a1b; raised night #202425; paper #f4f5f2; ink #202627; signal #b9cef0; secondary #657071.

Signature: the missing mention is the focal object. A readable answer document sits beside the finding; changing samples reveals that the answer itself varies. Confidence intervals and a source investigation connect the supporting evidence below.

Rejected defaults: a giant percentage without a finding; four equally weighted metric cards; decorative slogans. Replacements: a plain-language outcome, an inspectable answer, and unboxed engine estimates with uncertainty.

## Component intent before implementation

- Navigation: five stable jobs across the top; content receives the screen, not a wide sidebar. Same night surface, restrained active underline, 44px mobile controls.
- Finding and answer: one high-contrast composition. Manrope display at 64px/400 with tight tracking; body 14px at generous line height; IBM Plex Mono for dates and sample identifiers. The document, not a decorative illustration, supplies the light surface. Four answer selectors have one semantic purpose: showing sample variation.
- Engine strip: four open columns, not cards; figures at 31px, names at 12px, counts and interval details at 10–11px. All rows use computed Wilson intervals. Shared scale, no improvement claims.
- Investigation: a pale working surface marks the transition from reading to action. Copy names the evidence, the proposed inspection, and the limit of inference. The real cited URLs must be supplied by the product; none are invented in this study.
- Dialogs: native HTML dialogs for focus containment and Escape. Same paper palette; 44px close controls; return focus to the trigger. No backend mutations.
- Spacing: 4px base; 64px outer desktop margins, 72px hero-column separation, 24–28px document padding, 44px control targets. Desktop composition becomes a single readable sequence on mobile.

## Copy decisions

Chosen finding: "Most answers leave you out." It is licensed by this example dataset: 60 of 96 omit the brand. In a connected product it must be conditional on the actual result, not permanent marketing copy.

Alternatives considered: "Northstar appears in 36 of 96 answers" (accurate, less immediately interpretive); "Your brand is absent from 60 answers" (accurate but needs the denominator). Neither becomes a slogan.

Chosen CTA: "See where you're missing" → the prompt-level omissions. Alternative: "Read the missing mentions" is confusing; a missing mention is not itself something to read. "Explore insights" is too vague.

Chosen source action: "Inspect the cited pages". Not "Earn a mention", which implies a promised outcome. A citation is evidence of use, not causal proof or placement inventory.

## Scope

Standalone HTML prototype at `aelo-study-02.html`. All measurements and answer excerpts are illustrative, clearly labelled. No deployed app, auth, billing, formula implementation or data changed. Keep round one for comparison. Do not save this as the system until the user accepts a direction.

## Preview verification — 9 September 2026

- Inspected rendered screenshots at 1440px desktop and 390px mobile; no horizontal overflow at either width.
- Verified the custom fonts loaded. No browser console or JavaScript errors reported.
- Changed the answer sample and verified both mention status and the matching detail text changed.
- Tested Escape and focus return. Fixed the mobile menu-to-report transition so closing the report returns focus to the menu trigger.
- Exercised ready, running, partial and failed preview scan states. They do not issue provider requests.
- Reviewed the complete standalone HTML and checked its whitespace and JavaScript syntax.
- App tests, app/MCP type-checks, lint and production build were not rerun: this is an isolated static design study, not an app implementation. Real authentication, scans, citations, reports and persistence are not verified by this preview.
