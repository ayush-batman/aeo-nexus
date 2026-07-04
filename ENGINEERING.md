# Aelo — Engineering Practices
_Adopted from oh-my-pi (`omp`). Every commit follows these. If a rule is broken, roll back and redo._

## 1 · Edits land on the first attempt
No trial-and-error. Before an Edit, know: exact `old_string`, exact `new_string`, blast radius (grep every symbol touched, every file). If the fix doesn't compile clean on turn 1, stop and diagnose — don't fix the fix.

## 2 · Reads summarize, not dump
Target the region of interest: `offset`/`limit`, `grep -n symbol path`, `head -N`. Never Read a 500-line file for a 3-line change. Waste of context is waste of thinking.

## 3 · Renames go through the whole graph
Any symbol rename: `grep -rn old_name --include='*.ts' --include='*.tsx'` first. Fix every hit — call sites, types, tests, docs, migrations, CI. Never leave a half-renamed graph.

## 4 · Verify before moving on
Every change is proven, not assumed:
- Type/build error? Watch the dev-server log.
- API change? `curl` the endpoint with real inputs, real cookies.
- UI change? Preview screenshot + snapshot (structure, not just pixels).
- DB change? Query a real row after the mutation.
No "should work." Either it did or you didn't check.

## 5 · Honest data, always
Analytics products die from one lie. **The product never persists or shows a fabricated number.** When a provider fails, the UI shows an honest "provider unavailable" state — not mock data relabeled as real. No exceptions, no dev-mode carve-outs that leak to prod.

## 6 · Advisor pass on every non-trivial change
Before commit, self-review with these questions:
1. Did I read every file the change *actually* touches?
2. Did I regress anything (curl the neighbors)?
3. Am I honest about what still doesn't work?
4. Is the diff minimal — nothing snuck in that wasn't asked for?

## 7 · Course-correct fast
Bad path detected? Stop, back out, re-plan. The sunk-cost of 200 lines of half-work is zero. Ship 20 correct lines instead.

## 8 · Learnings survive
When something non-obvious bites us, save it to `~/.claude/projects/-Users-ayush/memory/` so the next session doesn't re-learn it (iCloud hangs, dead keys, mock masquerade — all already logged).

## 9 · Subagents for fan-out, not laziness
Multiple independent codebase searches → one Explore agent. Not for tasks that need coherent judgement on one file.

## 10 · One product metric on the wall
**Weekly Active Brands that completed one Action Queue item.** Every feature must plausibly move that number. If it doesn't, it doesn't ship.

---
_This file is the contract. Reread before shipping anything gnarly._
