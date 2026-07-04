# Aelo — Product Strategy Review
_The "board meeting" doc. Written 2026-07-03, immediately after the full technical audit (see AUDIT_AND_PLAN.md). Blunt on purpose._

---

## Part 1 — The brutal truths (read these twice)

### 1. You built 15 features before making 1 work
The codebase has: LLM Tracker, Battle Arena, Content Studio, Forum Hub, LLMs.txt Studio, Analytics, Agent Auditor, Playbook, Attribution, Experiments, Products, Prompts, Question-Mine, Alerts, Admin panel, two payment providers.

The core scan — the reason the product exists — currently returns **fabricated mock data relabeled as real Gemini results**. Every downstream number (Health Score, Share of Voice, Battle winner) is fiction on top of fiction.

This is the classic failure mode: **breadth as procrastination**. Building feature #12 feels like progress. Making feature #1 undeniably great is the actual hard work. A startup with 15 mediocre features loses to a startup with 1 magical one, every single time.

### 2. Faking data is the one unforgivable sin in an analytics product
Your entire product is "trust our numbers." The mock-fallback-silently-relabeled-as-gemini pattern (`llm-scanner.ts:344`, `scan/route.ts:75`) means a paying customer could make a real marketing decision on invented data. If one customer ever discovers that, the company is dead — not the feature, the *company*. Analytics products sell trust, not charts.

**Rule going forward: the product never shows a number it can't defend. An honest "provider down" error state builds more trust than a fake chart.**

### 3. "AI visibility dashboard" is already a commodity
Profound, Peec, Otterly, Scrunch, RankPrompt, and every SEO incumbent (Semrush, Ahrefs) are shipping AI-visibility tracking. "We show you your mentions in ChatGPT" is a 2024 pitch. By the time you ship, tracking alone is a feature, not a company.

The honest question: **why does Aelo win?** Not "what does it do" — every deck says the same thing. What do you know that they don't?

### 4. You don't have a user, you have a persona list
Concept note says: SaaS founders, brand managers, agencies. That's three different products with three different price points, workflows, and buying processes. Pick **one person** — a name, a face, someone you can message today — and build until *that person* uses it weekly without being reminded. Everything else is theater.

---

## Part 2 — The thesis: what "class apart" actually means here

Everyone in this space answers: **"What does the AI say about me?"** (a mirror)

The class-apart product answers: **"What do I do about it — and did it work?"** (a lever)

That's the whole strategy in one line. Tracking is the mirror. Nobody pays $500/mo for a mirror for long. They pay for a lever: *do this specific thing → your AI visibility moves → we prove it moved.*

### The magic loop (the only product that matters)

```
SCAN ──→ DIAGNOSE ──→ PRESCRIBE ──→ ACT ──→ RE-SCAN ──→ PROVE
 "You're invisible     "Because LLMs cite     "Publish this exact    "Visibility for this
  for 'best CRM         these 3 Reddit         FAQ page / answer      prompt went 0% → 40%
  for startups'"        threads + this G2      this thread (draft     in 3 weeks. Here's
                        page you're not on"    attached)"             the receipt."
```

You already have 80% of the parts, scattered across 15 features:
- **SCAN** = LLM Tracker + scheduled scans (built)
- **DIAGNOSE** = Citation analytics (built) — this is the causal layer: *which sources produce the answer*
- **PRESCRIBE** = Forum Hub reply generation + Content Studio + question mining (built, buried)
- **PROVE** = time-series scans + alerts (built)

The class-apart move is not building anything new. It's **welding these into one loop with one screen**, and deleting everything that isn't the loop.

### The moat (why this compounds)
A tracking tool's data is replaceable — anyone can query ChatGPT. What's NOT replaceable:

**Intervention → outcome pairs.** "Customer published X, visibility for prompt Y moved Z% in N weeks" — collected across hundreds of brands. After 12 months you have the only dataset in the world that says *what actually moves AI answers*. That makes your PRESCRIBE step smarter than anyone's, and it's un-copyable because it requires your users' history. That's the compounding asset. Design the schema for it **now** (an `interventions` table linking actions to scan deltas) even if the ML comes later.

---

## Part 3 — Cut list (the painful part)

**KEEP (the loop):**
- LLM Tracker + scheduled scans — the SCAN
- Citation analytics — the DIAGNOSE (this is your best differentiator; most competitors do mentions, not *source attribution*)
- One "Action Queue" — merge Forum Hub replies + content recommendations + question-mine outputs into a single ranked to-do list. Not three tools; one queue.
- Alerts → reframe as a **weekly "What changed + what to do" email digest**. This is your retention engine. B2B tools live and die on the Monday-morning email.
- Free scan — your growth wedge (more below)

**KILL or FREEZE (say it out loud: these are off):**
- **Battle Arena** — it's a filter on the scanner wearing a costume. Fold "vs competitor" into the main scan results.
- **Experiments, Attribution, Products, Playbook, LLMs.txt Studio** — five orphaned pages (literally not even in your nav). Freeze them. If a paying customer begs for one, unfreeze.
- **Multi-workspace agency mode** — until 10 single brands pay and retain, agencies are a distraction.
- **Stripe + Razorpay both** — pick one (Razorpay if going India-first, Stripe if global). Two billing systems at zero customers is pure waste.

Every one of these hurts to cut because you built it. Sunk cost. The product that ships is the loop.

---

## Part 4 — Growth: the free scan is the whole strategy

You already built `/api/free-scan`. This is your Ahrefs-free-tools / "Website Grader" moment — most founders never realize what they have here.

**The play:**
1. `aelo.com/scan` — enter your domain, no signup.
2. 60 seconds later: a beautiful, **shareable AI Visibility Report Card** — "How ChatGPT, Gemini & Perplexity see {brand}" — grade, top prompts where you're invisible, who's winning instead, which sources the AI trusts.
3. The card is public-linkable and OG-image'd. Founders share their grade (good or bad — bad grades get shared *more*: "wtf, ChatGPT thinks we're a furniture store").
4. Full prompt list + the Action Queue is behind signup. Report → email capture → activation.

This is a self-propagating loop with zero CAC that also builds your benchmark dataset. **Publish a monthly "AI Visibility Index" for a niche** (e.g., "Top 50 Indian D2C brands ranked by AI visibility") — instant PR, instant inbound, and it makes you the *authority*, not just a tool.

### Do things that don't scale (the YC part)
Before any of the funnel automation: **manually run the full report for 20 founders you know. Deliver it as a Loom + PDF. Charge 10 of them ₹5k for a "fix-it sprint."** You will learn more about what the PRESCRIBE step should say from 20 conversations than from 6 months of building. If you can't get 10 founders to care about a hand-made version, the automated version won't save you.

---

## Part 5 — Positioning & pricing

**Niche first.** "AEO for everyone" loses to Profound's funding. "The AI visibility platform for **Indian D2C & SaaS brands**" (or pick your niche — the point is picking) wins its segment: local pricing (₹, Razorpay — you built this), local benchmark index, local case studies, and competitors ignoring the segment. Own a hill, then expand.

**Pricing psychology:** don't sell scan quotas ("100 scans/mo" prices you as a utility). Sell outcomes:
- **Radar** (₹4,999/mo): weekly scans, digest email, report card — "know where you stand"
- **Command** (₹14,999/mo): daily scans + Action Queue + before/after proof — "move the numbers"
- **Concierge** (₹50k+/mo, first 10 customers only): you personally execute the actions. This funds the company while you learn, and every engagement feeds the interventions dataset.

Quotas cap your upside; outcomes justify 10x pricing. And a customer who *acts* on your prescriptions is retained forever — churn happens when the product is a mirror they stopped looking into.

---

## Part 6 — The metric that matters

Not signups. Not scans run. Not MRR (yet).

> **Weekly Active Brands that completed one Action Queue item.**

That single number contains: the data is real (P0 audit fix), the insight was believable, the prescription was doable, and the user came back. If that number grows week over week, everything else follows. Put it on a wall.

Second metric: **time-to-aha < 5 minutes** — signup → first "oh damn, I'm invisible for my most important prompt" moment. Onboarding should auto-generate the 10 highest-intent prompts from the brand URL (you built enrichment) and run the first scan *during* onboarding, so the dashboard is never empty.

---

## Part 7 — 30/60/90 (tied to the actual codebase)

**Days 0–14 — Make it true** (AUDIT_AND_PLAN P0/P1)
- Fix the runtime, rotate keys, **delete the mock-data pathway entirely** (not gated — deleted; honest error states instead)
- Fix the 4 confirmed bugs (health score key mismatch, citation casing, cron platform constraint, auth bypass)
- Purge fake rows from `llm_scans`
- Add the `interventions` table (action taken → linked scan deltas)

**Days 14–30 — Make it the loop**
- Merge Forum Hub + Content recs + Question-mine into one **Action Queue** screen
- Ship the **weekly digest email** (Resend is already wired)
- Cut the nav to 5 items: Dashboard, Scans, Sources (citations), Action Queue, Settings
- Onboarding: URL → auto-prompts → live first scan → aha in one session

**Days 30–60 — Make it spread**
- Public shareable Report Card + OG images on the free scan
- Manually onboard 20 design partners (10 paying anything at all)
- First monthly **AI Visibility Index** for your chosen niche

**Days 60–90 — Make it prove**
- Before/after visibility receipts on completed actions ("you did X, prompt Y moved 0→40%")
- First 3 case studies from design partners = your entire sales deck
- Only now: revisit pricing tiers, agency mode, the frozen features

---

## The one-line summary

**Stop building a dashboard that describes the problem. Build the loop that fixes it and proves it fixed it — for one niche, with one metric, and zero fake numbers.**

Everything in this doc is a corollary of that sentence.
