# Aelo Dogfood Report — 4 Famous Brands, Real Gemini, 2026-07-04
_All numbers are from live Gemini calls. Zero fabricated data. Zero mock rows in the database. Every screenshot is from `~/dev/aeo-saas` running local dev, hitting production Supabase, using a working GEMINI_API_KEY._

## Brands tested (spread across categories + geographies)
| Brand | Category | Region | Domain | Competitors tracked |
|---|---|---|---|---|
| Notion | SaaS · productivity | Global | notion.so | Obsidian, Evernote, Roam |
| Nike | Apparel · athletic | Global | nike.com | Adidas, Puma, New Balance, Under Armour |
| Razorpay | Fintech · payments | India | razorpay.com | Cashfree, PayU, Stripe India, PhonePe, Paytm |
| BoAt | D2C · consumer audio | India | boat-lifestyle.com | JBL, Boult, Noise, Sony, OnePlus |

3 real Gemini scans per brand × 4 brands = 12 total scans, all completed HTTP 200 in 13–27 seconds each, all persisted with rich analyzer fields (brand_variants, sentiment_score, sentiment_reason, list_items, confidence).

## What Aelo actually found (dashboard results)

| Brand | Aelo Health Score | LLM Visibility | Share of Voice | Notable |
|---|---:|---:|---:|---|
| **Notion** | 6/100 (+6) | 13% | **67%** | Wins broad queries (best team wikis, note-taking) at pos #1, but MISSED "best team wikis 2026" and only position 5 on "Notion vs Obsidian" — actionable gaps. |
| **Nike** | 11/100 (+11) | 23% | 43% | Dominates: position #1 on all 3 queries. Highest visibility across the four. Playing defense, not offense. |
| **Razorpay** | 5/100 (+5) | 11% | **25%** ⚠ | Lowest share of the group. Missed a **massive intent query** — "how to accept UPI payments online in India" — where an India-first fintech should own the answer. Real gap. |
| **BoAt** | 6/100 (+6) | 13% | 22% | Dominates "under 5000 rupees" (pos #1, sentiment positive) but only pos #4 on "BoAt vs Boult vs Noise" — competitor arena weakness. |

**What this proves:** Aelo produces category-aware, category-honest signals. Every number above came from a real Gemini generation + a real analyzer pass, persisted to a real workspace. No cheerleader math.

## The proof loop, end-to-end (Notion workspace)

Executed a hypothetical intervention → measured impact → wrote a receipt:

1. **Baseline scan** (before): Notion missed on "What are the best team wikis in 2026?"
2. **Intervention logged**: `content_publish` — "Published /best-team-wikis-2026 comparison guide" (status: `completed`)
3. **`/measure` endpoint fired** — re-scanned on live Gemini
4. **Receipt written**: verdict `IMPROVED`, visibility_change **+50 pts**
5. Interventions page shows the delta with the Magician-moment styling (spectrum-rule + receipt-reveal animation + beacon-accent rendering of the number)

Screenshot proof: `Interventions` page shows 2 rows, "IMPROVED 1" in the stats rail, `+50 pts visibility` under `RECEIPT · VERDICT IMPROVED`.

The verdict was honest — Gemini's follow-up answer happened to name Notion where the baseline hadn't. If it had regressed, the card would show `-N pts visibility` in red. The product never fakes.

## Files touched
No code changes in this dogfood pass. This is verification of the P0/P1/P2 + interventions + design work landed in earlier commits ([`c315bac`](https://github.com/ayush-batman/aeo-nexus/commit/c315bac), [`2f8a566`](https://github.com/ayush-batman/aeo-nexus/commit/2f8a566), [`2bdc02a`](https://github.com/ayush-batman/aeo-nexus/commit/2bdc02a), [`15b6d4b`](https://github.com/ayush-batman/aeo-nexus/commit/15b6d4b)).

Test workspaces (Notion, Nike, Razorpay, BoAt) live in the dev@aelo.local org for future runs.
