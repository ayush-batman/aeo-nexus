# AGENTS.md

## Project purpose

This repository contains Aelo (`aeo-nexus`), an AI-visibility measurement product for marketing, SEO, growth teams, and founders. It helps them understand how AI assistants answer about their brand, see the real sources those assistants cite, and choose work that can earn a defensible mention.

The most important customer journey is:

Homepage or signup → brand onboarding with 3–5 editable buyer prompts → multi-sample scan across entitled AI engines → decision packet with visibility, confidence, citations, gaps, and one ranked action

The measurement pipeline is the product’s trust boundary. Do not replace failed or missing provider results with generated or mock data.

## Commands

- Install: `npm ci`
- Development: `npm run dev`
- Production build: `npm run build -- --webpack`
- Lint: `npm run lint`
- App type-check: `npm run typecheck`
- MCP type-check: `npm run typecheck:mcp`
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- All tests: `npm test`
- End-to-end tests: not configured yet; use an authorized non-production account for manual browser verification until a `test:e2e` script exists

## Required quality gates

Before considering work complete:

1. Run the relevant regression tests, then the full test suite for shared or high-risk changes.
2. Run linting plus both app and MCP type-checks.
3. Run the production build.
4. Exercise changed user journeys in a browser at relevant mobile and desktop widths.
5. Inspect browser console and network errors.
6. Add regression coverage for fixed bugs.
7. Review `git diff --check`, the final Git diff, and repository status.
8. State every check that could not be run; do not present an unverified check as passed.

## Engineering rules

- Fix root causes, not symptoms.
- Do not disable tests, type checks, build checks, or lint rules to make a gate pass.
- Do not use unsafe typing without a documented reason.
- Do not expose secrets or log credentials, provider payload secrets, or API keys.
- Validate input on the server.
- Enforce authentication, workspace binding, roles, scopes, entitlements, and quotas on the server.
- Preserve `/api/v1`, MCP behavior, stored scan data, Stripe, and Razorpay compatibility unless instructed otherwise.
- Keep database migrations additive where practical and document their order and rollback.
- Keep commits scoped and reversible.
- Avoid unrelated refactoring and preserve user-owned untracked files.
- Follow existing project patterns unless they are the source of the problem.

## Measurement rules

- Preserve multi-sample execution, sample counts, confidence intervals, raw evidence, partial failures, and persistence status.
- A provider citation must come from structured provider evidence. A URL found only in generated prose is a `link_mentioned`, not a provider citation.
- Comparisons require compatible prompt, engine, provider model, region, mode, scorer version, contract version, and sufficient sample counts.
- Missing, legacy, failed, or incompatible evidence produces `partial`, `all_failed`, `untracked`, or `inconclusive` states—not a fabricated zero or improvement claim.
- Keep API-key authorization, scopes, expected 401/403/429 behavior, and atomic quota reservation intact.

## Product and UI rules

- Optimize for user comprehension and task completion.
- Keep the five primary jobs clear: Overview, Prompts & Scans, Sources, Actions, and Reports & Settings.
- Use existing design-system and Radix primitives where possible.
- Include distinct loading, empty, success, partial, stale, error, and retry states where applicable.
- Support keyboard navigation, focus restoration, reduced motion, and responsive layouts.
- Aim for 44px mobile and 40px dense-desktop interactive targets.
- Preserve Aelo’s calm measurement-instrument visual language: noir/ivory surfaces, border-led hierarchy, restrained status color, and evidence-first presentation.
- Do not copy competitor branding, assets, code, or proprietary copy.
- Do not introduce generic template UI that conflicts with the product.

## Safety

- Do not deploy without explicit approval.
- Do not use production data or production billing for testing.
- Do not apply or roll back database migrations without explicit approval and a verified target.
- Do not execute destructive database operations without explicit approval and a recoverable export.
- Do not commit credentials, `.env` files, generated build output, `.agents/`, or `skills-lock.json` unless explicitly requested.
- Production code must ignore the development auth bypass.

## Release notes

The product-rescue rollout order and open staging gates are documented in:

- `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`
- `docs/product-rescue/DEPLOYMENT_AND_ROLLBACK.md`
- `docs/product-rescue/IMPLEMENTATION_PLAN.md`
