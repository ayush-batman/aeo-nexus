# Aelo MCP

Ask your AI assistant how visible your brand is across ChatGPT, Gemini, Claude and Perplexity, and act on it in the same chat.

Aelo's MCP is **read-first and honest**:

- **Multi-sampled numbers.** Every visibility figure comes from asking each engine the same question several times, and is returned with its confidence and sample count. A single screenshot of an LLM answer is a coin flip; we do not report coin flips.
- **Receipts.** Citations come back as the actual URLs the model pulled from. Accuracy claims come back with the source they were checked against.
- **No manipulation, by design.** There is no `send_upvotes`, no "order citations", no "post on my behalf". The only writes are measurement actions: schedule a scan, track a buyer question. Aelo measures visibility; it never fakes it.

## Tools

**Reads**

| Tool | What it answers |
| --- | --- |
| `list_brands` | Which brand/workspace this key can see |
| `get_visibility_overview` | How visible am I right now, per engine, with confidence |
| `get_visibility_trend` | Am I gaining or losing ground over time |
| `run_visibility_scan` | Fresh multi-sample scan for one buyer question, with raw evidence |
| `get_answer_volatility` | How much the answer changes when you ask again (our signature metric) |
| `compare_competitors` | Share of voice vs competitors, prompt by prompt |
| `analyze_prompt_gaps` | The buyer questions I should own and don't |
| `list_citations` | The real URLs engines cited (filter to ones that cite me or not) |
| `find_citation_sources` | Which domains shape my category, ranked |
| `get_accuracy_verdict` | Factual claims AI made about me, checked true/false/outdated with sources |
| `get_crawler_access` | Can AI crawlers reach me, plus AI referral traffic |
| `list_prompts` | The buyer questions currently tracked |

**Writes — measurement only**

| Tool | What it does |
| --- | --- |
| `track_prompt` | Start measuring visibility on a buyer question |
| `schedule_scan` | Schedule a recurring multi-sample scan |

## Setup

1. **Get a key.** In Aelo, go to **Settings → API keys** and create a read-only key. Copy the `alo_live_…` secret (shown once).
2. **Build the server.**
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```
3. **Add it to your assistant.**

**Claude Desktop** — add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "aelo": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "AELO_API_KEY": "alo_live_your_key_here",
        "AELO_API_BASE": "https://aelohq.com/api/v1"
      }
    }
  }
}
```

**Cursor** — add the same block to `~/.cursor/mcp.json`.

**Codex / other MCP clients** — point them at `node dist/index.js` with the two env vars set.

### Copy-paste install prompt

> Add the Aelo MCP server to my config. It runs with `node /absolute/path/to/mcp-server/dist/index.js`, and needs env `AELO_API_KEY` (my `alo_live_…` key) and `AELO_API_BASE=https://aelohq.com/api/v1`. Then ask it `get_visibility_overview` for my brand.

## Configuration

| Env var | Default | Notes |
| --- | --- | --- |
| `AELO_API_KEY` | _(required)_ | Your `alo_live_…` key. Read-first; scoped to one workspace. |
| `AELO_API_BASE` | `https://aelohq.com/api/v1` | Point at a local Aelo (`http://localhost:3000/api/v1`) for dev. |

## Backend status

The server talks to Aelo's `/api/v1/*` endpoints, authenticated by the API key (see `lib/api-auth.ts`, `lib/api-v1.ts`, and migration `024_create_api_keys.sql`).

**All 14 tools are wired** to real endpoints, each a thin, key-guarded wrapper (workspace-scoped admin client) over logic Aelo already has:

| Endpoint | Backed by |
| --- | --- |
| `GET /brands` | `workspaces` |
| `GET /visibility/overview` | `getVisibilityMetrics` (sample count + confidence) |
| `GET /visibility/trend` | `llm_scans`, aggregated by day |
| `POST /scan` | `scanLLM` looped `samples` times, aggregated with evidence |
| `GET /volatility` | `llm_scans`, flip-rate per prompt/engine |
| `GET /competitors` | `llm_scans.competitors_mentioned` |
| `GET /prompts/gaps` | `prompt_library` × `llm_scans` |
| `GET /citations` | `llm_scans.citations` (real URLs) |
| `GET /citations/sources` | `llm_scans.citations`, aggregated by domain |
| `GET /accuracy` | `accuracy_claims` |
| `GET /crawlers` | `checkCrawlerAccess` + `getAiReferralTraffic` |
| `GET /prompts` · `POST /prompts` | `prompt_library` |
| `POST /scans/schedule` | `scheduled_scans` |

**Before it runs end to end:** apply migration `024_create_api_keys.sql` and issue a key (a `Settings → API keys` UI is the remaining piece; until then a key can be minted with `generateApiKey()` from `lib/api-auth.ts` and inserted directly). Everything typechecks; the endpoints have not yet been exercised against live workspace data.
