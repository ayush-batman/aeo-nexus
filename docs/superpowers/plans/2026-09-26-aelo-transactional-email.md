# Aelo Transactional Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send honest, deduplicated welcome and first-results mail in addition to existing authentication and alert mail.

**Architecture:** Account and onboarding mutations schedule a backend action only when the relevant event first occurs. The action renders email content and passes it to the existing delivery ledger, which checks membership, freezes sender/payload, and records provider acceptance or failure. The target Convex deployment owns the key and sender settings.

**Tech Stack:** Convex, Better Auth, Resend, React Email, Vitest.

**Spec:** `docs/product-rescue/EMAIL_LIFECYCLE_SPEC.md`

## Global Constraints

- Never use production data or billing for tests.
- Never claim an email was delivered merely because it was queued or accepted by a provider.
- Preserve the existing auth verification/reset and weekly/alert behavior.
- Do not deploy without explicit approval.

---

### Task 1: Welcome mail on new verified account

**Files:** Modify `convex/users.ts`, `convex/mail.ts`, `convex/mailActions.ts`, `components/emails/WelcomeEmail.tsx`; test `tests/convex/user-provisioning.spec.ts` and `tests/convex/mail.spec.ts`.

**Interfaces:** The scheduled action receives internal user/workspace IDs and a fixed `welcome:<user public ID>` dedupe key; `mail.enqueue` accepts kind `welcome`.

- [x] Add a failing test proving one scheduled welcome for a new verified account and none on subsequent provisioning or imported claim.
- [x] Run the focused test and confirm the failure is the missing lifecycle event.
- [x] Schedule the action in the same transaction as new-user creation; render the welcome with the configured site origin, and enqueue through the existing ledger.
- [x] Run the focused test and mail-ledger tests; confirm passes.

### Task 2: First persisted onboarding result mail

**Files:** Modify `convex/scheduled.ts`, `convex/mail.ts`, `convex/mailActions.ts`; create `components/emails/FirstResultsEmail.tsx`; test `tests/convex/activation.spec.ts` and `tests/convex/mail.spec.ts`.

**Interfaces:** The reconciler passes the completed decision-packet ID to an internal action exactly on its first terminal transition. The action links to onboarding results and distinguishes complete, partial, and all-failed outcomes. `mail.enqueue` accepts kind `first_results`.

- [x] Add tests for once-only terminal transition, partial wording, no premature send, and preference isolation.
- [x] Run focused tests and confirm the missing terminal event failed before implementation.
- [x] Implement transition scheduling, rendered content, and ledger deduplication. Never turn missing samples into zero or a success claim.
- [x] Run focused tests and confirm passes.

### Task 3: Verify and document the deployment gate

**Files:** Modify `docs/product-rescue/EMAIL_LIFECYCLE_SPEC.md`; test with all repository gates.

**Interfaces:** No new public API.

- [x] Run tests, lint, app and MCP type-checks, and production build.
- [x] Exercise the public sign-up screen in a browser; signed-in and inbox delivery checks remain blocked by missing test email configuration and account access.
- [x] Check test Convex configuration presence without printing secrets or sending mail.
- [x] Review the final diff/status. Do not deploy or claim live delivery.

## Self-review

- [x] Confirm account and result events, duplicate prevention, failure states, and preference rules are covered.
- [x] Confirm no placeholders, production side effects, or unsupported billing promises were added.
