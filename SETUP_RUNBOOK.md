# Aelo — Unblock & Run Runbook
_Do these 3 things (~10 min) and the dev server + browser verification will work. Then I build for real._

Root cause of the hangs (proven): the project lives in `~/Desktop` which is **iCloud-synced**, plus a backup daemon, plus your disk is **99% full**. That combo hangs the Next dev server and git on filesystem I/O. Fix = get the project out of iCloud + free space + live API keys.

---

## Step 1 — Move the project out of iCloud (fresh clone)
GitHub already has all the latest fixes, so clone fresh into a folder iCloud does NOT sync (e.g. `~/dev`). Do NOT keep working under `~/Desktop`.

```bash
mkdir -p ~/dev
git clone https://github.com/ayush-batman/aeo-nexus.git ~/dev/aeo-saas
cd ~/dev/aeo-saas

# bring your local secrets over (the OLD file — you'll replace the keys in Step 2)
cp ~/Desktop/projects/aeo-saas/.env.local ~/dev/aeo-saas/.env.local
```

## Step 2 — Rotate ALL 4 API keys (the current ones are dead/leaked)
Your Gemini key was flagged **leaked** → treat all keys as compromised and rotate. Put the new values in `~/dev/aeo-saas/.env.local`:

| Env var | Where to get it | Why it matters |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | **Critical** — the analyzer + most features. Nothing works without this. |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys (+ add billing) | ChatGPT scanner |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com (+ add credits) | Claude scanner |
| `PERPLEXITY_API_KEY` | https://www.perplexity.ai/settings/api | Perplexity scanner (was empty) |

Optional but recommended (restores Reddit forum discovery, currently off):
`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` → create an app at https://www.reddit.com/prefs/apps (type: "script").

> After rotating, delete the old keys in each provider's dashboard so the leaked ones can't be abused.

## Step 3 — Free disk space (99% full is risky for your real work too)
Quick wins:
```bash
# see what's biggest in your home dir
du -sh ~/* 2>/dev/null | sort -h | tail -15
# common offenders: ~/Library/Caches, old node_modules, Downloads, Docker
rm -rf ~/Library/Caches/*          # safe to clear
# empty Trash, and check Storage in System Settings > General > Storage
```
Aim for at least ~10 GB free.

## Step 4 — Install & run
```bash
cd ~/dev/aeo-saas
npm install          # runs the iceberg-js stub postinstall automatically
npm run dev          # should be ready in ~10s and actually serve pages now
```
Open http://localhost:3000 — the landing page should load. `/login` and `/dashboard` should respond (no more hangs).

## Step 5 — Tell me you're ready
Once `npm run dev` serves the landing page in your browser, say **"ready"** and I'll:
1. Re-run the engine harness to confirm all providers are green.
2. Start the P0 build (kill the fake-data pathway, fix the 4 confirmed bugs, add the `interventions` table for before/after proof), **verifying each feature live in your browser** as I go.

---
### What I already fixed (in the repo, so the fresh clone has them)
- `middleware.ts` → `proxy.ts` (Next 16 deprecated the old convention).
- Removed the build-time Google Fonts fetch that was hanging compilation (fonts now via system stack in `globals.css`).

### Note on your Desktop copy
`~/Desktop/projects/aeo-saas` still has all your files intact, but its local `.git` history got corrupted (unborn HEAD) — that's why we cloned fresh. Once you're on `~/dev/aeo-saas`, you can delete the old Desktop copy after confirming the new one runs.
