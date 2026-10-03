# Public Receipt Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a temporary public-receipt loading failure a clear retry path without misreporting it as a failed AI scan.

**Architecture:** Add a route-segment error boundary at `/scan/[id]` that catches fetch/render failures and uses Next's `reset()` to retry the same receipt. Keep the UI neutral and never print raw error messages or identifiers. The saved scan and its status remain untouched.

**Tech Stack:** Next.js App Router, React, existing Aelo Button primitive, Node rendered-component tests.

**Spec:** `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`, section D, P2 local receipt resilience.

## Global Constraints

- A page-loading error is not a provider-scan failure; do not show a false `failed` result.
- Do not expose internal errors, customer data, or credentials in the browser.
- Keep a keyboard-accessible 44px retry target, responsive layout, and no unnecessary motion.
- Do not deploy without explicit approval.

---

## File map

- `app/(marketing)/scan/[id]/error.tsx`: local retry boundary for one receipt route.
- `tests/unit/public-receipt-error.test.ts`: rendered copy, retry affordance, and no raw error leakage.

### Task 1: Render an honest receipt-loading error

**Files:** Create `app/(marketing)/scan/[id]/error.tsx`; test `tests/unit/public-receipt-error.test.ts`.

**Interfaces:** Next calls the default component with `{ error: Error & { digest?: string }, reset: () => void }`.

- [x] Write a failing static-render test requiring clear retry copy, a return link, and no exposure of the supplied internal error or digest.

```ts
const html = renderToStaticMarkup(createElement(ReceiptError, {
  error: Object.assign(new Error('private backend detail'), { digest: 'internal-123' }), reset: () => {},
}));
assert.match(html, /Receipt could not load/);
assert.match(html, /Try again/);
assert.doesNotMatch(html, /private backend detail|internal-123/);
```

- [x] Run the focused test and confirm module-not-found failure.
- [x] Add a neutral, border-led error boundary using the existing `Button` primitive. The button calls `reset`; the secondary link returns to the free scan.
- [x] Force a local-only Convex connection refusal. The retry UI rendered, stayed on the same receipt after a retry, and had no mobile overflow. Expected connection-error logs appeared; a separate script-render warning remains on this failure path.
- [ ] Re-run full tests, lint, both type-checks, build, and diff review; commit and push without deploying.

## Self-review

- Retrying cannot reserve another scan or spend quota; it reloads the same receipt route.
- Copy does not conflate page fetch failure with provider failure.
- No raw error details are exposed to the visitor.
