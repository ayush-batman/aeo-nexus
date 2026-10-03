# Public Answer Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show useful, explicitly unverified other names from a free-scan answer without treating an empty configured-competitor list as proof that no rivals appeared.

**Architecture:** A bounded, deterministic parser reads only formatted list headings in the persisted provider answer. The public receipt returns possible names and an explicit `not_configured` competitor-tracking status. Existing raw answers stay unchanged; no provider request or schema migration is added.

**Tech Stack:** TypeScript, Convex, Next.js, Node test runner, Vitest.

**Spec:** `docs/product-rescue/REAL_WORLD_QA_2026-09-26.md`, sections C and G.

## Global Constraints

- Never call a candidate a verified competitor or recommendation.
- Preserve `competitors_mentioned: []` for old clients; add a separate status so absence is not misread as a measured zero.
- Parse only the saved raw answer, with no extra provider call or database write.
- Limit output to eight names and 240 characters of verbatim evidence each.
- Do not deploy without explicit approval.

---

## File map

- `lib/ai/answer-name-candidates.ts`: pure extraction from explicit formatted list entries.
- `convex/publicScans.ts`: expose candidate list and `not_configured` status on public receipts.
- `app/api/scan/public/route.ts`: pass the distinction through the initial response.
- `app/(marketing)/scan/[id]/page.tsx`: explain the unverified candidate names in the receipt.
- `tests/unit/answer-name-candidates.test.ts`, `tests/convex/public-scans.spec.ts`: regression cases.

### Task 1: Extract only answer-backed names

**Files:** Create `lib/ai/answer-name-candidates.ts`; test `tests/unit/answer-name-candidates.test.ts`.

**Interfaces:** `extractAnswerNameCandidates(response: string, brandName: string): Array<{name:string; evidence:string}>`.

- [x] Write a failing test with a Buffer alternatives answer containing `* **Hootsuite** is ...` and `* **Planable** offers ...`. Require both exact answer-backed names, exclude `Buffer`, and exclude a generic `**Key features**` bullet.

```ts
const answer = '* **Hootsuite** is a scheduling tool.\n* **Planable** offers approvals.\n* **Key features** include queues.\n* **Buffer** is the product to replace.';
assert.deepEqual(extractAnswerNameCandidates(answer, 'Buffer').map(row => row.name), ['Hootsuite', 'Planable']);
```
- [x] Run `npx tsx --test tests/unit/answer-name-candidates.test.ts`; confirm module-not-found failure.
- [x] Implement a line-anchored parser for bullet/numbered entries with bold leading names and a following choice description. Require exact source substrings, de-duplicate case-insensitively, exclude the target brand using `matchesBrand`, and cap at eight results and 240 evidence characters.

```ts
const heading = /^\s*(?:[-*•]|\d+[.)])\s+\*\*([^*\n]{2,60})\*\*\s+(?:(?:is|offers|provides|works|has)\b|[—–:-])/i;
// Apply to bounded lines, verify every emitted evidence span is in response,
// exclude matchesBrand(name, [brandName]), and stop after eight unique names.
```
- [x] Re-run the focused test; all cases pass. The saved non-production Buffer answer yields six exact names with verbatim excerpts.

### Task 2: Surface untracked competitor state

**Files:** Modify `convex/publicScans.ts`, `app/api/scan/public/route.ts`, `app/(marketing)/scan/[id]/page.tsx`; test `tests/convex/public-scans.spec.ts`.

**Interfaces:** Public receipt adds `competitor_tracking_status: 'not_configured'` and `answer_name_candidates: Array<{name:string; evidence:string}>` while retaining `competitors_mentioned` for compatibility.

- [x] Extend the legacy public-row test with a formatted alternatives answer; confirm the new fields initially fail.

```ts
expect(await t.query(api.publicScans.get, { id: publicId })).toMatchObject({
  competitor_tracking_status: 'not_configured',
  answer_name_candidates: [{ name: 'Planable', evidence: '* **Planable** offers approvals.' }],
});
```
- [x] Add strict Convex return validators, derive candidates from the stored response on read, and pass fields through the initial scan API result.

```ts
const answerNameCandidate = v.object({ name: v.string(), evidence: v.string() });
// publicReceipt: competitor_tracking_status: v.literal('not_configured'),
// answer_name_candidates: v.array(answerNameCandidate)
```
- [x] Render “Other names to review” for a completed answer, with an explicit untracked message when parsing yields none. Label names as unverified, never recommendations.
- [x] Run focused tests, then `npm test` (214 Node, 62 Convex), lint, both type-checks, and `npm run build -- --webpack`.
- [x] Browser-check the saved non-production Buffer receipt at desktop and mobile widths: old backend output loads without page, console, or network errors. New list rendering is covered by component tests but awaits an approved backend rollout for browser verification.
- [ ] Review `git diff --check` and final diff, then commit and push. Do not deploy.

## Self-review

- No extra AI call or unbounded database query.
- Old receipts gain the same answer-backed extraction from their stored response.
- Empty configured competitors remain explicitly untracked, not a measured zero.
