# Public Scan Async Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the homepage navigate to a durable public scan receipt immediately after reservation, rather than holding its request open while Gemini generates the answer.

**Architecture:** Reuse the existing `Prefer: respond-async` parser and the existing queued/running receipt UI. Only the homepage widget opts in; callers without the preference keep the current wait-and-return behavior. The backend scan job and quota reservation remain unchanged.

**Tech Stack:** Next.js App Router, TypeScript, Convex, Node tests.

**Spec:** `docs/product-rescue/IMPLEMENTATION_PROGRESS.md`, live measurement and latency follow-up; `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`, public-scan journey.

## Global Constraints

- Preserve idempotency keys, weekly quota, failure receipts, and synchronous response compatibility.
- Never claim an answer exists while the receipt is queued or running.
- Do not make an extra provider call or deploy without explicit approval.

---

## File map

- `components/marketing/free-scan-widget.tsx`: send `Prefer: respond-async` for this UI only.
- `app/api/scan/public/route.ts`: return the queued receipt link with HTTP 202 immediately after the durable reservation when preferred.
- `tests/integration/public-scan-radar-preview.test.ts`: guard the opt-in contract and branch ordering.

### Task 1: Opt into immediate receipt navigation

**Files:** Modify `components/marketing/free-scan-widget.tsx`, `app/api/scan/public/route.ts`; test `tests/integration/public-scan-radar-preview.test.ts`.

**Interfaces:** `prefersRespondAsync(request.headers): boolean` from `lib/http-prefer.ts`; 202 JSON `{scanId,status:'queued',shareUrl,statusUrl,rateLimit}`.

- [x] Write a failing test requiring the opt-in header, route branch, and branch ordering before receipt polling.

```ts
assert.match(widget, /'Prefer': 'respond-async'/);
assert.match(route, /if \(prefersRespondAsync\(request\.headers\)\)/);
assert.ok(route.indexOf('if (prefersRespondAsync(request.headers))') < route.indexOf('do {'));
```

- [x] Run the focused integration test and confirm failure.
- [x] Add the header in the widget request. In the route, after quota reservation and before `do {`, return a queued 202 receipt for preferred callers.

```ts
if (prefersRespondAsync(request.headers)) {
  return NextResponse.json({ scanId: result.id, status: 'queued', shareUrl: `/scan/${result.id}`,
    statusUrl: `/api/scan/public/${result.id}`, rateLimit }, { status: 202 });
}
```

- [x] Run focused and full tests (215 Node and 62 Convex), lint, both type-checks, and the production build. Homepage loads at desktop and 390px mobile width without page, console, or network errors.
- [ ] Verify the actual 202 → queued receipt → completed/failed transition with an authorized non-production scan. This was not run merely to spend another provider call.
- [ ] Review diff, commit, and push without deploying.

## Self-review

- The durable reservation completes before the 202 response.
- Legacy callers still get their existing synchronous result or timeout response.
- The receipt page polls its own saved status and never fabricates a result.
