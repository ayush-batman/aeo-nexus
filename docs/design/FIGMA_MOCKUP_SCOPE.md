# Aelo complete mockups — scope checkpoint

Status: five core screens are now built as an isolated clickable local prototype at `aelo-core.html`, with desktop/mobile layouts and sample states. See `CORE_PREVIEW_NOTES.md`. Figma Starter tool-call limit still blocks Figma work; only shared foundations and guide exist there, not screen mockups. The remaining route set is not complete.

File: https://www.figma.com/design/IobBMH636bBaDMXWpFVCIH
Plan: team::1585617759113958496
Initial blank page: 0:1

## P0.a — Product and route inventory

67 Next.js page routes found on 9 September 2026:

- 34 public routes: homepage; product; features; pricing; methodology; manifesto; about; brand; customers; security; contact; docs; MCP; India index; changelog; privacy; terms; blog index; 11 article routes; public scan result; four solution pages (agencies, founders, India, marketing).
- 23 workspace routes: onboarding; overview; accuracy; analytics; attribution; audit; battle; content studio; crawlers; drift; experiments; forum hub; insights; actions/interventions; prompts & scans/llm-tracker; playbook; positioning; products; prompt research; question mine; report; settings; sources.
- 4 account routes: signup, login, forgot password, reset password.
- 6 admin routes: overview, analytics, clients, client detail, settings, usage.

`/dashboard/insights` redirects to `/dashboard/interventions`. Map it to the Actions screen, not a duplicate invented page. This leaves 66 distinct route screens. Dynamic scan and client routes need one representative detail design each, not production records.

Extra views: onboarding steps, answer/sample details, prompt editor, source detail, action detail, engine detail, scan progress, report preview, settings subsections (workspace, members, billing, API keys, integrations), mobile navigation, and confirmation dialogs.

States: loading, empty/untracked, success, partial provider failure, all failed, stale, inconclusive comparison, quota exhausted, insufficient permission, session expired. Show how to recover without fabricating measurements.

Coverage goal: desktop and mobile for each distinct page; additional state frames for the shared journeys. Every route mapped to a named Figma frame before calling the set complete.

## P0.b — Figma discovery

New file is empty: one page, zero local variable collections, zero local text/effect styles, no local components or existing screens. No Code Connect files found in the repository. No Aelo library discovered.

Verified fonts available: Manrope Regular/Medium/SemiBold/Bold and IBM Plex Mono Regular/Medium. These match the current study's primary and utility fonts. The wordmark must be carried over deliberately, not silently swapped to generic text.

## P0.c — Libraries

Eight community libraries are subscribed by default. Simple Design System has Button, Input Field, typography and colour variables. These are not Aelo's own assets. Do not apply the community visual theme to Aelo or claim the local file has no library variables.

Search returned relevant component keys:

- Button: cc8b558dc7d9684011b6b99ce8e6509399bc836b
- Input Field: c28150b04d333d34ed9d2b77abd9f2f54e1a878a

Inspect exact variants/token compatibility before choosing import, wrapper, or local Aelo component. Searches for other needed components remain part of their creation steps. The tool clamps batches to one query, so run remaining identified queries individually.

## P0.d — Proposed foundation

Use study 02 as the proposed direction, not as approval to change production UI. Source: `docs/design/aelo-study-02.html` and `ROUND_2_NOTES.md`.

- Night #171a1b; raised night #202425; night border #353a3c.
- Paper #f4f5f2; raised paper #fdfdfa; ink #202627.
- Quiet text #a0a9aa; secondary text #657071; paper border #d8deda.
- Signal #b9cef0; signal ink #324c74; annotation #6d84a5.
- Four-pixel spacing foundation, with 8/12/16/24/32/48/64 steps; 44px mobile controls.
- Manrope display, headings, body and controls; IBM Plex Mono sample identifiers and measurement metadata. Increase undersized secondary copy from the study where needed for accessibility.
- Colour primitives plus semantic aliases; one-mode collections where required by Starter plan. No assumption that multiple Figma variable modes are supported.
- Text styles: display, page title, section title, body, body strong, label, metadata. Border-led surfaces; restrained elevation for overlays only.

Reusable pieces: navigation, buttons, fields, tabs, status labels, empty/error messages, answer document, sample selector, engine estimate with uncertainty, prompt row, source row, action item, tables, modal/drawer, settings section, public header/footer, article layout, report section.

## P0.e–f — Gaps and decisions

- Code has page structure and study styles; Figma has none of the Aelo-specific screens or components yet.
- Figma has generic community library assets; these must not override the requested Aelo look.
- Existing production UI is not the visual source of truth for this redesign. Study 02 is the proposed starting point, subject to user confirmation.
- Keep the five primary product jobs. Place secondary tools under those jobs rather than creating 22 equally prominent navigation items.
- Improve copy per screen: describe the finding, evidence, next action and uncertainty. Do not paste the overview headline across every screen.
- No production data, invented live citations, testimonials, customer logos, prices or success claims. Use labelled fictional fixtures; verify existing public copy before reuse.
- This is a mockup deliverable, not a deployment or backend change.

## Required exit checks

All 67 routes mapped; native editable text/layouts and reusable instances; desktop/mobile screenshots inspected; no clipped/overlapping text; sample arithmetic consistent; missing/failed data distinguished from zero; prototype links for the main journey; final Figma links and honest remaining limitations.

Progress: 34 verified variables, nine text styles, three pages (Starter page limit), a cover/guide and type/spacing specimens. No broken aliases, missing code syntax or broad scopes. The swatches/screenshot call was blocked by the tool limit; its writes are unconfirmed. Visual verification is pending.

Resume checkpoint: `/tmp/design-system-state-aelo-20260909.json`; returned IDs: `/tmp/aelo-figma-ledger-progress.json`; helper code: `/tmp/aelo-figma-helpers.js`. Verify the foundation frame before resuming. Do not repeat repository discovery or recreate shared values. Next: reusable controls, five core screens, mobile/states, then remaining routes after core review. No production app changes.
