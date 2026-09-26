# Aelo independent real-world product QA — 26 September 2026

## Scope and evidence rules

This audit used the protected Vercel preview on the `aelo-test` Convex deployment (`woozy-starfish-810`), not production. The test business was [Buffer](https://buffer.com/), a real social media management product. Three real Gemini API answers were obtained through Aelo's public scan endpoint; no scan record was inserted by hand. API receipts below are the source of truth for the full raw answers and the structured provider citation metadata. Source pages and Buffer's own website were checked independently. No production data, production billing, or production deployment was used.

The protected preview could be exercised through the project's authorized Vercel CLI, but opening that preview as a normal browser visitor led to Vercel's access-request page. A local rendering of receipt 1 initially failed because its Convex fetch timed out, then rendered correctly on reload. Browser interaction was subsequently interrupted, so post-fix mobile, console, network, and signed-in browser checks are **not verified**.

## A. Exact end-to-end journey

1. Read Buffer's [homepage](https://buffer.com/) and [pricing page](https://buffer.com/pricing). Buffer serves creators, small businesses, and agencies; supports Instagram and LinkedIn scheduling; its Free plan permits three channels and ten scheduled posts per channel, while annual Essentials starts at $5 per channel per month. These are independent ground-truth facts, not Aelo outputs.
2. Called Aelo's real website auto-fill on `https://buffer.com/`. It returned `Buffer`, `SaaS - Social Media Management`, a broadly correct description, `Small Businesses, Creators, Agencies`, and suggested Hootsuite, Sprout Social, and Later. It explicitly labelled the result `unverified_ai_suggestions`. Auto-fill did not return products, prices, important URLs, or proof that suggested competitors were verified.
3. Ran the non-branded budget question twice and a branded alternatives question once through the protected preview's `/api/scan/public` using valid browser-format request IDs. All three completed with real `gemini-2.5-flash` responses and persisted receipts. The invalid test ID I first supplied produced HTTP 503 instead of a validation error; Convex logs showed `invalid_public_scan`, and no scan was reserved for it.
4. Re-read each persisted receipt through `/api/scan/public/{id}` and compared it with the initial response. The stored brand mention, position, citation count, and raw text were unchanged.
5. Opened receipt 1 in a local Aelo browser. It displayed the complete Gemini answer and nine links marked `provider citation`, plus a clear one-sample disclaimer and locked multi-sample fields. Its first local render failed on a transient Convex connection timeout; reload succeeded. The raw Markdown answer was shown literally, including `**` markers.
6. The first-time account-to-project journey stopped at verification: the `aelo-test` backend lacks `RESEND_API_KEY` and `AELO_AUTH_EMAIL_FROM`, although email signup is configured to require verification. A prior test signup response reported success but could not deliver the verification email. Google provider status returned `{"google":true}`, but no authorized disposable Google account was available to complete OAuth. Therefore no authenticated Buffer project, four-sample decision packet, dashboard score, historical run, or project deletion was created in this audit.

### Product pipeline mapped

Homepage free scan → `app/api/scan/public/route.ts` → Convex IP/quota reservation → `convex/publicScanActions.ts` → `scanLLM` (Gemini) → deterministic brand matching and AI sentiment → structured citation extraction → Convex `publicScans` → receipt API and page. This path saves one answer, not a full visibility score.

Signed-in path: Better Auth → workspace/onboarding → website auto-fill (`brand-enrichment.ts`, homepage snippet + Gemini suggestions) → user-edited 3–5 prompts → `convex/activation.ts` queues four samples per entitled engine per prompt → measurement workflow and provider adapters (Gemini, ChatGPT, Claude, Perplexity when keys exist) → `measurementSamples`/`scans` → `buildDecisionPacket` and dashboard. Source views use provider citation records; historical comparisons require matching prompt, engine, model, region, mode, scorer, contract, search mode, and analyzer metadata with at least four successful samples in each period. Google AI Overview and `mock` have no real adapter and fail rather than masquerading as Gemini.

## B. Ground-truth comparison

The full raw answer and all structured citation records remain in each receipt. The short excerpts below are enough to audit the classification without copying three long answers into this document.

| Receipt, UTC time, buyer question | Manual ground truth from raw answer | Aelo persisted result | Agreement |
| --- | --- | --- | --- |
| [1: budget discovery](https://aelo-rescue-preview.vercel.app/scan/4f7f2c8e-6b36-4ee4-86ce-dbe6d7c7a926), 11:11:34, “What social media scheduling tools are good for a small business managing Instagram and LinkedIn on a tight budget?” | Buffer named and recommended first (“excellent choice”). Six other named recommendations: Later, Zoho Social, Metricool, SocialBee, Postoria, Crowdfire. Nine structured Gemini provider citations; none is Buffer's own domain. | `brand_mentioned=true`, `mention_position=1`, positive, `competitors_mentioned=[]`, nine `provider_citation` records, one sample. | Brand/position/citation count agree. Competitor coverage is absent. Recommendation is not stored. |
| [2: alternatives](https://aelo-rescue-preview.vercel.app/scan/7c6fc9d8-951a-4d31-a7f4-f3977c80e25d), 11:12:33, “What are good alternatives to Buffer for a five-person team that needs approval workflows and LinkedIn scheduling?” | Buffer is mentioned as the product to replace, **not recommended**. Six alternatives are recommended: Hootsuite, Sendible, Sprout Social, Planable, SocialPilot, Agorapulse. Ten structured provider citations. No ranked Buffer position. | `brand_mentioned=true`, `mention_position=null`, negative, `competitors_mentioned=[]`, ten `provider_citation` records, one sample. | Mention/position/citation count agree. Aelo cannot represent “mentioned but not recommended”; rival recommendations are absent. Negative sentiment is arguable, not established by a traceable explanation in the public receipt. |
| [3: repeat of question 1](https://aelo-rescue-preview.vercel.app/scan/086c4e06-d7a3-4295-8db2-57a94cd4ec77), 11:14:26, same budget question | Buffer again recommended first. Six other named recommendations: Pallyy, Zoho Social, Later, Publer, CoSchedule, SocialBee. Ten structured provider citations; source mix differs from receipt 1. | `brand_mentioned=true`, `mention_position=1`, positive, `competitors_mentioned=[]`, ten `provider_citation` records, one sample. | Brand/position/citation count agree. Competitor coverage is absent. Recommendation is not stored. |

The manually observed brand-mention result is 3/3 across these **different prompt intents**, not a valid single-prompt confidence cohort. For the two identical budget-question repeats it is 2/2 mentions (100% observed); a 95% Wilson interval is approximately 34%–100%, so this is not stable proof of broad visibility. Aelo correctly does **not** display a visibility percentage on these one-answer public receipts. It also cannot calculate a signed-in dashboard score from these public receipts, which are not a project run.

All 29 saved citations have `provenance=provider_citation` and non-empty Gemini grounding references. They are structured provider evidence, not URLs scraped from the prose. All 29 have `fetchValidation=not_checked`; therefore the audit confirms provenance but **not** that every target URL remains reachable or supports the model's claim. The first three receipt-1 source pages were independently opened: [Technology Advice](https://technologyadvice.com/blog/marketing/best-social-media-schedulers/), [Sprout Social](https://sproutsocial.com/insights/social-media-scheduling-tools/), and [MeetEdgar](https://meetedgar.com/blog/affordable-social-media-management-tools).

## C. Incorrect or missing data

- No false Buffer mention or false provider citation was found in the three real receipts. This is a small sample, not a general accuracy guarantee.
- The public result reports zero `competitors_mentioned` for all three answers despite six named rival tools in each. The free-scan path passes `competitors: []` into the scanner, so this is an unmeasured field presented as an empty list, not evidence that there were no competitors.
- There is no persisted `brand_recommended` or `competitor_recommended` field in the scanner/result contract. Receipt 2 demonstrates why mention cannot stand in for recommendation.
- The public receipt preserves provider model in the API but does not show it beside the answer in the UI. It shows source provenance, yet does not say that link reachability was not checked.
- The result of website auto-fill is broad but incomplete: it does not verify Buffer's exact plans/prices, supported channel details, product pages, or whether the suggested competitors are the most relevant for this buyer. These claims must remain suggestions.

## D. Product failures

1. **P1 — First-time project blocked in test:** email verification cannot be delivered from `aelo-test` because the email service settings are absent. A successful signup response is not a successful customer journey. Google is configured, but full OAuth was not exercised with a disposable test account. No authenticated Buffer project was created.
2. **P1 — Decision packet could prescribe the wrong action:** the prior code treated any external cited source as a missing brand mention. The top cited Technology Advice article in receipt 1 already calls Buffer its best beginner choice and links to Buffer. “Earn a relevant mention there” would waste the customer's time. The prior algorithm also selected a source across all prompts while attaching the weakest prompt, even when that source came from a different question.
3. **P1 — Full recommendation visibility not measured:** Aelo tracks mentions, not whether the answer actually recommends the brand or rivals. Receipt 2 is a real counterexample to treating those as equivalent.
4. **P2 — Preview access:** the protected Vercel preview opened a Vercel access-request page in a normal Chrome tab. CLI bypass permitted the API audit, but this is not a complete normal-user browser test.
5. **P2 — Local receipt resilience:** a transient Convex connect timeout produced a full-page server error on the first local receipt load; reload succeeded. A customer on that path gets no in-page retry state. This was local and was not reproduced on the protected preview.

## E. Recommendation-quality failures

The original `earn_source_mention` action inferred a content gap from citation provenance alone. That inference failed on the live Buffer example: [Technology Advice already recommends Buffer](https://technologyadvice.com/blog/marketing/best-social-media-schedulers/) and links to it. The original `publish_direct_answer` action also did not check whether the customer's own website already answered the question. The fixed local code now says to **review** the cited page or existing site answer first, ties the cited source to the weakest prompt, withholds content work when all successful answers mention the brand, and withholds it for incomplete or fewer-than-four-sample evidence. It does not claim to prove a causal lift.

## F. UX failures

- Before the local fix, website auto-fill silently saved an AI-generated description and target audience that the onboarding form did not show or let the user edit. The local fix exposes both fields and labels AI suggestions as unverified.
- The onboarding default prompt “Buffer vs the leading alternatives” is vague and brand-led. A marketer needs specific buyer-intent prompts and the ability to compare unbranded discovery with branded alternatives. The fields are editable, but Aelo does not derive a complete intent mix automatically.
- The receipt is honest about one sample, but the raw answer displays Markdown markers literally. This preserves the verbatim text but hurts readability.
- The receipt's headline says “named early,” which is accurate for a mention but does not tell the marketer whether Buffer was recommended. This distinction matters in the alternatives example.
- The preview's source section previously called all external provider citations “source gaps”; the local UI now calls them “Sources the providers cited” and warns that a citation does not prove a missing mention.
- The signed-in dashboard's ability to answer “who is beating me, why, and what should I do?” was not verified through a real first-time account, so its UX must not be signed off from static tests.

## G. Engineering bugs and risk ranking

| Severity | Location | Failure scenario | Correction/status |
| --- | --- | --- | --- |
| P1 | `lib/measurement/decision-packet.ts` | Cited article already recommends the brand; packet says earn a mention. Or source from strong prompt is attributed to weak prompt. | Fixed locally with prompt-bound source review and explicit uncertainty; regression tests pass. Not deployed. |
| P1 | `convex/authActions.ts`, `convex/authProviders.ts`, signup page | No Resend key/sender on test backend; email signup may report “check your email” though none can be sent. | Local UI/backend status now fail-closed and disable email signup when delivery is not configured. To enable it, a verified test Resend setup is still required. Not deployed. |
| P1 | `lib/ai/llm-scanner.ts`, measurement contract | Brand mentioned only as an alternative to avoid or replace still contributes a mention; no separate recommendation signal exists. | Not safely fixed here; requires an explicit recommendation classifier, evidence field, versioned contract, persistence, and dashboard semantics before release. |
| P2 | `app/(dashboard)/onboarding/page.tsx` | AI-enriched description/audience were hidden and uneditable before save. | Fixed locally, with labelled evidence status and regression check. Not deployed. |
| P2 | `app/api/scan/public/route.ts` | Invalid idempotency key reached Convex and surfaced as HTTP 503. | Fixed locally to return 400 before any backend call; regression check passes. Not deployed. |
| P2 | `convex/publicScanActions.ts`, public receipt | Public scan passes an empty competitor list, so named rivals are persisted as `[]`. | Open. Either distinguish “not tracked” from “none found” or add bounded entity discovery with a verified competitor set. |
| P2 | public receipt rendering | First local Convex timeout caused full-page error; no receipt-level retry UI. | Open; reproduce on a stable test browser before changing error handling. |
| P3 | public receipt rendering | Literal Markdown markers make the verbatim answer harder to scan. | Open; render a safe readable view alongside a verbatim copy, without altering saved evidence. |

## H. Fake or unfinished functionality

The fake-data audit searched customer-facing application, component, Convex, and measurement code for `mock`, `fake`, `placeholder`, `TODO`, `FIXME`, `dummy`, `sample`, `hardcoded`, `Math.random`, `setTimeout`, and `console.log`. No simulated provider answer was found in the live public-scan execution path: unsupported `mock` and Google AI Overview engines explicitly fail; provider failures remain failures. `lib/analytics/demo-seed.ts` contains illustrative rows but has no production import found in this audit. The marketing answer sequence is hardcoded and visibly labelled illustrative, not live analysis. The Radar preview explicitly locks unmeasured samples and confidence fields.

Unfinished functionality is still material: true recommendation detection, automatic rival discovery for public scans, verified page-gap detection, full website understanding, and an authenticated real-world multi-engine audit. The test backend has only Gemini credentials among the four AI providers; ChatGPT, Claude, and Perplexity liveness was not demonstrated in this audit. The existence of adapters is not a liveness test.

## I. Fixes and verification

Local changes made in this QA pass:

1. Corrected decision-packet action wording and evidence selection; added tests for already-mentioned sources, no observed gap, sparse samples, cross-prompt source leakage, partial failures, and unsaved results.
2. Exposed editable auto-fill description and audience with an unverified-evidence note.
3. Added backend-owned email availability to auth-provider status and disabled email signup when verification mail cannot be sent.
4. Mapped malformed public scan request IDs to HTTP 400 instead of a generic 503.

Checks: 208 Node tests passed, 54 Convex tests passed, lint passed, app and MCP type-checks passed, production webpack build passed, and `git diff --check` passed. The source-action fix was rerun against a Buffer-shaped regression case; the live protected preview has **not** been redeployed, so the three real receipts still reflect the old shipped version. No Convex deployment or production release was made. Post-fix browser/mobile/console checks remain unverified after the browser interruption.

## J. Capability verdict

| Capability | Verdict | Evidence / limit |
| --- | --- | --- |
| Website understanding | PARTIAL | Buffer's broad category/audience matched official pages; features, prices, URLs, and competitors were not comprehensively verified or captured. |
| Prompt quality | PARTIAL | Three natural questions were run; default onboarding suggestions are generic and the full intent mix was not exercised. |
| AI query execution | PARTIAL | Three real Gemini calls succeeded and persisted; the other three engines were not live-tested. |
| Mention detection | PASS for tested subset | 3/3 Buffer mention flags matched raw answers, including alternatives context. Broader accuracy unknown. |
| Recommendation detection | FAIL | No separate recommendation signal; receipt 2 shows mention without recommendation. |
| Citation detection | PARTIAL | 29/29 saved links had structured Gemini grounding references; reachability/content not checked for all. |
| Competitor detection | FAIL on free scan | 18 named rival recommendations across three answers; persisted list was empty every time because no rivals were configured. |
| Metrics | PARTIAL | One-answer receipts correctly withheld a visibility score; no authenticated dashboard score was generated for independent recalculation. |
| Evidence traceability | PARTIAL | Raw answer, prompt, model and citation metadata persisted; UI omits model and link validation status. |
| Recommendations | FAIL in deployed preview; PARTIAL locally | Live cited source already mentions Buffer, contradicting old action. Local conservative correction tested but not deployed. |
| Historical measurement | UNVERIFIED | No authenticated multi-period project run. |
| Authentication | FAIL for test email signup; Google UNVERIFIED | Missing test email settings; Google is configured but OAuth was not completed. |
| Data persistence | PASS for public receipts only | All three real answers survived read-back with unchanged key fields; signed-in persistence unverified. |
| Production build | PASS | `npm run build -- --webpack` succeeded locally. |

**Overall verdict:** Aelo can capture and save real Gemini answers with honest one-sample receipts. It does **not yet pass** the stated full customer promise of a defensible multi-engine visibility decision for a new account. The next live gate is a disposable verified test login (or configured test email delivery) and access to the protected preview, followed by a true four-sample, signed-in Buffer packet and dashboard-to-raw-evidence reconciliation.
